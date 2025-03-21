import { FolderStructure, StructureCounts } from "./types";

/**
 * Parse the text representation of a folder structure
 * Supports multiple formats including indentation and box-drawing characters
 */
export function parseFolderStructure(text: string): FolderStructure {
  // Strip any markdown code block markers or headers before parsing
  text = text.replace(/^```[\s\S]*?```$/gm, (match) => {
    // Extract only the content inside the code block
    const content = match.replace(/^```.*\n|\n```$/g, "");
    return content;
  });

  // Remove markdown headers
  text = text.replace(/^#.*$/gm, "");

  // Remove markdown explanatory text
  text = text.replace(/^This will create.*$/gm, "");
  text = text.replace(/^Click.*$/gm, "");

  const lines = text.split("\n").filter((line) => line.trim()); // Keep the original indentation!

  const structure: FolderStructure = {};
  const pathStack: string[] = [];
  const depthStack: number[] = [0];

  for (const line of lines) {
    // Calculate leading whitespace (actual spaces, not trimmed)
    let indentation = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === " ") {
        indentation++;
      } else {
        break;
      }
    }

    // If using box drawing chars, estimate depth differently
    let depth = 0;
    let boxDrawingFound = false;

    // Count the number of box drawing prefix characters to determine depth
    for (let i = 0; i < line.length; i++) {
      const char = line.charAt(i);
      if (["┃", "┣", "┗", "├", "│", "└"].includes(char)) {
        boxDrawingFound = true;
        depth++;
      } else if (char === " " || char === "─") {
        // Skip spaces and horizontal lines in depth counting
        continue;
      } else {
        break;
      }
    }

    // If no box drawing characters found, calculate depth by space indentation
    if (!boxDrawingFound) {
      // Use 2 spaces per level as the standard indentation
      depth = Math.floor(indentation / 2);
    }

    // Get the name part (trim to remove extra spaces at end)
    let name = line.substring(indentation).trim();

    // Clean any remaining box drawing characters
    name = name.replace(/[┃┣┗├│└─]/g, "").trim();

    // Skip if this is a markdown-related line that wasn't caught earlier
    if (
      name.startsWith("#") ||
      name === "```" ||
      name.match(/^This will create|^Click/)
    ) {
      continue;
    }

    console.log(`Line: "${line}", Depth: ${depth}, Name: "${name}"`);

    // Adjust path stack based on depth
    while (
      depthStack.length > 1 &&
      depthStack[depthStack.length - 1] >= depth
    ) {
      depthStack.pop();
      pathStack.pop();
    }

    // Determine if this is likely a file or folder
    // If it has an extension and doesn't end with slash, assume file
    const isFile = name.includes(".") && !name.endsWith("/");

    // Update stacks
    pathStack.push(name);
    depthStack.push(depth);

    console.log(`Path stack: ${JSON.stringify(pathStack)}`);
    console.log(`Depth stack: ${JSON.stringify(depthStack)}`);

    // Build the structure
    let current = structure;
    for (let i = 0; i < pathStack.length; i++) {
      const part = pathStack[i];
      if (i === pathStack.length - 1) {
        if (isFile) {
          current[part] = null;
        } else {
          if (!current[part]) {
            current[part] = {};
          }
        }
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part] as FolderStructure;
      }
    }
  }

  return structure;
}

/**
 * Count the number of files and folders in the structure
 */
export function countFilesAndFolders(
  structure: FolderStructure
): StructureCounts {
  let files = 0;
  let folders = 0;

  for (const [_, children] of Object.entries(structure)) {
    if (children === null) {
      files++;
    } else {
      folders++;
      const counts = countFilesAndFolders(children);
      files += counts.files;
      folders += counts.folders;
    }
  }

  return { files, folders };
}

/**
 * Render a preview of the structure as text
 */
export function renderStructurePreview(
  structure: FolderStructure,
  prefix = ""
): string {
  let result = "";
  const entries = Object.entries(structure);

  for (let i = 0; i < entries.length; i++) {
    const [name, children] = entries[i];
    const isLast = i === entries.length - 1;
    const line = prefix + (isLast ? "└── " : "├── ") + name + "\n";
    result += line;

    if (children !== null) {
      const newPrefix = prefix + (isLast ? "    " : "│   ");
      result += renderStructurePreview(children, newPrefix);
    }
  }

  return result;
}
