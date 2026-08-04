import {
  NodeType,
  ParseResult,
  ParseWarning,
  StructureCounts,
  TreeNode,
} from "./types";

export interface ParseOptions {
  /** How many columns a tab character is worth */
  tabWidth: number;
}

const DEFAULT_OPTIONS: ParseOptions = { tabWidth: 4 };

/** Characters that draw the vertical "trunk" of a tree */
const VERTICAL = new Set(["│", "┃", "┆", "┇", "╎", "║", "¦"]);

/** Characters that draw a branch off the trunk */
const BRANCH = new Set(["├", "└", "┣", "┗", "┠", "┖", "╠", "╚", "╰"]);

/** Characters that draw the horizontal arm of a branch */
const HORIZONTAL = new Set(["─", "━", "═", "—", "–"]);

/** Extensionless names that are conventionally files, not folders */
const EXTENSIONLESS_FILES = new Set([
  "dockerfile",
  "containerfile",
  "makefile",
  "gnumakefile",
  "justfile",
  "rakefile",
  "gemfile",
  "brewfile",
  "podfile",
  "procfile",
  "jenkinsfile",
  "vagrantfile",
  "berksfile",
  "fastfile",
  "appfile",
  "cartfile",
  "license",
  "licence",
  "copying",
  "notice",
  "authors",
  "contributors",
  "contributing",
  "changelog",
  "changes",
  "readme",
  "codeowners",
  "owners",
  "cname",
  "install",
  "news",
  "todo",
  "version",
  "gradlew",
  "mvnw",
]);

/** Dot-prefixed names that are conventionally folders, not files */
const DOT_DIRECTORIES = new Set([
  ".git",
  ".github",
  ".gitlab",
  ".vscode",
  ".vs",
  ".idea",
  ".settings",
  ".husky",
  ".circleci",
  ".devcontainer",
  ".config",
  ".cache",
  ".yarn",
  ".gradle",
  ".m2",
  ".aws",
  ".ssh",
  ".docker",
  ".bundle",
  ".well-known",
  ".storybook",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".expo",
  ".venv",
  ".terraform",
  ".ebextensions",
  ".platform",
]);

/** Windows device names that can never be used as a path segment there */
const RESERVED_WINDOWS_NAMES =
  /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

const PROSE_PREFIXES =
  /^(this will create|this creates|click|note:|notes:|here is|here's|the above|the following|for example|e\.g\.|i\.e\.|sure[,!.]|certainly[,!.])/i;

/**
 * Parse a text representation of a folder structure.
 *
 * Handles box-drawing trees (both `├──` and `┣` styles), ASCII trees (`|--`),
 * markdown bullet lists, and plain space or tab indentation. Depth is derived
 * from the column the entry name starts at rather than from the number of
 * drawing characters, which is what lets all of these formats share one parser.
 */
export function parseStructure(
  text: string,
  options: Partial<ParseOptions> = {}
): ParseResult {
  const { tabWidth } = { ...DEFAULT_OPTIONS, ...options };
  const warnings: ParseWarning[] = [];

  // If the input contains fenced code blocks, the tree is what is inside them
  // and everything around it is prose. This is the usual shape of text copied
  // out of a chat window or a README.
  const fenced = extractFencedBlocks(text);
  const isFenced = fenced !== null;
  const source = (fenced ?? text).replace(/\r\n?/g, "\n");

  const roots: TreeNode[] = [];
  const stack: TreeNode[] = [];
  const columns: number[] = [];
  const explicitDirectories = new Set<TreeNode>();

  const lines = source.split("\n");

  // When a line is rejected as unsafe, everything nested under it is dropped
  // too: those entries were meant to live inside a path we refused to create.
  let poisonedIndent: number | null = null;

  for (let index = 0; index < lines.length; index++) {
    const original = lines[index];
    if (!original.trim()) {
      continue;
    }

    const lineNumber = index + 1;
    const line = expandTabs(original, tabWidth);
    const indent = gutterWidth(line);

    if (poisonedIndent !== null) {
      if (indent > poisonedIndent) {
        continue;
      }
      poisonedIndent = null;
    }

    const { name, explicitDirectory } = cleanName(line.slice(indent));

    if (!name) {
      continue;
    }

    if (isFenceMarker(name) || name === "#" || name.startsWith("# ")) {
      continue;
    }

    if (looksLikeProse(name, isFenced)) {
      warnings.push({
        line: lineNumber,
        message: "skipped, this looks like prose rather than a path",
        text: name,
      });
      continue;
    }

    const segments = name.split(/[/\\]+/).filter((segment) => segment.length > 0);
    if (segments.length === 0) {
      continue;
    }

    if (/^([/\\]|[A-Za-z]:)/.test(name)) {
      warnings.push({
        line: lineNumber,
        message: "absolute path was made relative to the target folder",
        text: name,
      });
    }

    const rejection = segments
      .map((segment) => validateSegment(segment))
      .find((problem): problem is string => problem !== null);

    if (rejection) {
      warnings.push({ line: lineNumber, message: rejection, text: name });
      poisonedIndent = indent;
      continue;
    }

    // Column ladder: a deeper column pushes a level, a shallower one pops back
    // to the nearest enclosing level. Unlike a fixed "N spaces per level" rule
    // this copes with 2-, 3- and 4-space indents, tabs and drawing characters.
    while (columns.length > 0 && indent < columns[columns.length - 1]) {
      columns.pop();
    }
    if (columns.length === 0 || indent > columns[columns.length - 1]) {
      columns.push(indent);
    }
    const depth = columns.length - 1;

    stack.length = Math.min(stack.length, depth);

    let container = stack.length > 0 ? stack[stack.length - 1].children : roots;
    let node: TreeNode | undefined;

    for (let position = 0; position < segments.length; position++) {
      const segment = segments[position];
      node = container.find((child) => child.name === segment);
      if (!node) {
        node = { name: segment, type: "directory", children: [] };
        container.push(node);
      }
      if (position < segments.length - 1) {
        container = node.children;
      }
    }

    if (node) {
      if (explicitDirectory) {
        explicitDirectories.add(node);
      }
      stack.push(node);
    }
  }

  finalizeTypes(roots, explicitDirectories);

  return { nodes: roots, warnings };
}

/**
 * Count the number of files and folders in the structure
 */
export function countFilesAndFolders(nodes: TreeNode[]): StructureCounts {
  let files = 0;
  let folders = 0;

  for (const node of nodes) {
    if (node.type === "file") {
      files++;
    } else {
      folders++;
    }
    const counts = countFilesAndFolders(node.children);
    files += counts.files;
    folders += counts.folders;
  }

  return { files, folders };
}

/**
 * Render the structure as a tree. Folders are given a trailing slash so the
 * output is unambiguous, and so that feeding it back in reproduces the same
 * structure.
 */
export function renderStructurePreview(nodes: TreeNode[], prefix = ""): string {
  let result = "";

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const suffix = node.type === "directory" ? "/" : "";

    result += prefix + (isLast ? "└── " : "├── ") + node.name + suffix + "\n";

    if (node.children.length > 0) {
      result += renderStructurePreview(
        node.children,
        prefix + (isLast ? "    " : "│   ")
      );
    }
  }

  return result;
}

/**
 * Replace tabs with spaces, rounding up to the next tab stop
 */
function expandTabs(line: string, tabWidth: number): string {
  if (!line.includes("\t")) {
    return line;
  }

  let out = "";
  for (const character of line) {
    if (character === "\t") {
      out += " ".repeat(tabWidth - (out.length % tabWidth));
    } else {
      out += character;
    }
  }
  return out;
}

/**
 * Return the width of the leading "gutter": indentation plus any tree drawing
 * characters. The result is the column at which the entry name begins.
 */
function gutterWidth(line: string): number {
  let i = 0;
  let sawBullet = false;
  // True while we sit directly on a connector and its horizontal arm. A space
  // closes the arm, so a dash after one is part of the name, not the drawing.
  let armOpen = false;

  while (i < line.length) {
    const character = line[i];
    const next = line[i + 1];

    if (character === " ") {
      armOpen = false;
      i++;
      continue;
    }

    if (VERTICAL.has(character) || BRANCH.has(character)) {
      armOpen = true;
      i++;
      continue;
    }

    if (HORIZONTAL.has(character) || (character === "-" && armOpen)) {
      // An arm only belongs to the gutter if a connector opened one. Otherwise
      // this is a name that happens to start with a dash.
      if (!armOpen) {
        break;
      }
      i++;
      continue;
    }

    // ASCII trees: "|-- name", "|   name", "+-- name", "`-- name"
    if (
      (character === "|" ||
        character === "+" ||
        character === "`" ||
        character === "\\") &&
      (next === "-" || next === " ")
    ) {
      armOpen = true;
      i++;
      continue;
    }

    // Markdown bullet lists. The trailing space is required so that names like
    // "+page.svelte" or "-draft.md" survive intact.
    if (!sawBullet && (character === "-" || character === "*") && next === " ") {
      i++;
      sawBullet = true;
      armOpen = false;
      continue;
    }

    break;
  }

  return i;
}

/**
 * Strip comments, `tree -F` type indicators and trailing slashes from an entry
 */
function cleanName(raw: string): { name: string; explicitDirectory: boolean } {
  let name = raw.trim();

  // Trailing comments. The leading whitespace is required so that names such as
  // "issue#3.txt" are not truncated.
  name = name.replace(/\s+(?:#|\/\/|<-{1,2}|←|=>|➜|<!--).*$/, "").trim();

  // Type indicators appended by `tree -F` and friends
  name = name.replace(/[*@=|]+$/, "").trim();

  let explicitDirectory = false;
  while (name.endsWith("/") || name.endsWith("\\")) {
    explicitDirectory = true;
    name = name.slice(0, -1).trim();
  }

  return { name, explicitDirectory };
}

function isFenceMarker(name: string): boolean {
  return /^(```|~~~)/.test(name);
}

/**
 * Detect lines that are commentary about the tree rather than part of it
 */
function looksLikeProse(name: string, isFenced: boolean): boolean {
  if (name.endsWith(":")) {
    return true;
  }
  if (PROSE_PREFIXES.test(name)) {
    return true;
  }
  // Inside a fenced block the user has told us where the tree is, so we trust
  // long names. Outside one, a run of words is almost always a sentence.
  if (!isFenced && name.split(/\s+/).length >= 4) {
    return true;
  }
  return false;
}

/**
 * Reject anything that could escape the target folder or fail to be written
 */
function validateSegment(segment: string): string | null {
  if (segment === "." || segment === "..") {
    return `skipped, "${segment}" is not a valid name`;
  }
  if (CONTROL_CHARACTERS.test(segment)) {
    return "skipped, name contains control characters";
  }
  if (/^[A-Za-z]:$/.test(segment)) {
    return "skipped, drive letters are not allowed";
  }
  if (process.platform === "win32" && RESERVED_WINDOWS_NAMES.test(segment)) {
    return `skipped, "${segment}" is a reserved name on Windows`;
  }
  return null;
}

/**
 * Decide file or folder for every node, now that we know which ones have
 * children and which were explicitly marked with a trailing slash.
 */
function finalizeTypes(
  nodes: TreeNode[],
  explicitDirectories: Set<TreeNode>
): void {
  for (const node of nodes) {
    if (node.children.length > 0 || explicitDirectories.has(node)) {
      node.type = "directory";
    } else {
      node.type = classifyLeaf(node.name);
    }
    finalizeTypes(node.children, explicitDirectories);
  }
}

/**
 * Best guess at whether a childless entry is a file or an empty folder.
 *
 * Checked in order of confidence: known extensionless files, known dot-folders,
 * dotfiles, then a real extension. Anything left over is treated as a folder.
 */
export function classifyLeaf(name: string): NodeType {
  const lower = name.toLowerCase();

  if (DOT_DIRECTORIES.has(lower)) {
    return "directory";
  }
  if (EXTENSIONLESS_FILES.has(lower)) {
    return "file";
  }
  if (lower.startsWith("dockerfile.") || lower.endsWith(".dockerfile")) {
    return "file";
  }
  if (name.startsWith(".")) {
    return "file";
  }
  if (/\.[A-Za-z0-9]{1,10}$/.test(name)) {
    return "file";
  }
  return "directory";
}

/**
 * Pull the contents of every fenced code block out of the text
 */
function extractFencedBlocks(text: string): string | null {
  const fence = /^[ \t]*(?:```|~~~)[^\n]*\n([\s\S]*?)^[ \t]*(?:```|~~~)[ \t]*$/gm;
  const blocks: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = fence.exec(text)) !== null) {
    if (match[1].trim()) {
      blocks.push(match[1]);
    }
  }

  return blocks.length > 0 ? blocks.join("\n") : null;
}
