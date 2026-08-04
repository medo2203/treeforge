import * as vscode from "vscode";
import { parseStructure } from "./parser";
import {
  ConflictError,
  createFolderStructure,
  findConflicts,
} from "./creator";
import { confirmCreation, openStructurePreview } from "./previewer";
import { ConflictPolicy, CreateResult, ParseResult } from "./types";

let output: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  output = vscode.window.createOutputChannel("TreeForge");

  context.subscriptions.push(
    output,
    vscode.commands.registerCommand("treeforge.create", (uri?: vscode.Uri) =>
      createStructureFromText(uri)
    ),
    vscode.commands.registerCommand("treeforge.preview", () =>
      previewStructure()
    )
  );
}

export function deactivate() {}

/**
 * Read the selection (or the whole document) and create it on disk
 */
async function createStructureFromText(invokedOn?: vscode.Uri): Promise<void> {
  const parsed = parseActiveEditor();
  if (!parsed) {
    return;
  }

  if (parsed.nodes.length === 0) {
    vscode.window.showErrorMessage(
      "TreeForge: no folder structure found in the selected text."
    );
    return;
  }

  const target = await resolveTarget(invokedOn);
  if (!target) {
    return;
  }

  const conflicts = await findConflicts(parsed.nodes, target);

  if ((await confirmCreation(parsed, conflicts, target)) === "cancel") {
    return;
  }

  const policy = vscode.workspace
    .getConfiguration("treeforge")
    .get<ConflictPolicy>("onConflict", "skip");

  let result: CreateResult;
  try {
    result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "TreeForge: creating structure",
        cancellable: true,
      },
      (progress, token) =>
        createFolderStructure(parsed.nodes, target, {
          policy,
          token,
          onProgress: (label) => progress.report({ message: label }),
        })
    );
  } catch (error) {
    if (error instanceof ConflictError) {
      vscode.window.showErrorMessage(
        `TreeForge: stopped, ${error.conflict} already exists.`
      );
    } else {
      vscode.window.showErrorMessage(
        `TreeForge: failed to create structure — ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    return;
  }

  report(result, parsed, target);
}

/**
 * Show what would be created, without touching the disk
 */
async function previewStructure(): Promise<void> {
  const parsed = parseActiveEditor();
  if (!parsed) {
    return;
  }
  await openStructurePreview(parsed);
}

function parseActiveEditor(): ParseResult | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage(
      "TreeForge: open a file containing a folder structure first."
    );
    return undefined;
  }

  const selection = editor.selection;
  const text = selection.isEmpty
    ? editor.document.getText()
    : editor.document.getText(selection);

  if (!text.trim()) {
    vscode.window.showErrorMessage("TreeForge: nothing to parse.");
    return undefined;
  }

  const tabWidth = vscode.workspace
    .getConfiguration("treeforge")
    .get<number>("tabWidth", 4);

  return parseStructure(text, { tabWidth });
}

/**
 * Work out where to create the structure. Invoking the command from the
 * Explorer uses that folder directly; otherwise ask, defaulting to the
 * workspace root.
 */
async function resolveTarget(
  invokedOn?: vscode.Uri
): Promise<vscode.Uri | undefined> {
  if (invokedOn) {
    try {
      const stat = await vscode.workspace.fs.stat(invokedOn);
      return stat.type === vscode.FileType.Directory
        ? invokedOn
        : vscode.Uri.joinPath(invokedOn, "..");
    } catch {
      // fall through to the picker
    }
  }

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
  const picked = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    defaultUri: workspaceRoot,
    openLabel: "Create structure here",
  });

  return picked?.[0];
}

function report(
  result: CreateResult,
  parsed: ParseResult,
  target: vscode.Uri
): void {
  output.appendLine(`TreeForge — ${new Date().toISOString()}`);
  output.appendLine(`Target: ${target.fsPath}`);

  for (const path of result.created) {
    output.appendLine(`  created  ${path}`);
  }
  for (const path of result.skipped) {
    output.appendLine(`  skipped  ${path} (already exists)`);
  }
  for (const failure of result.failed) {
    output.appendLine(`  failed   ${failure.path} — ${failure.reason}`);
  }
  for (const warning of parsed.warnings) {
    output.appendLine(
      `  line ${warning.line}: ${warning.message} — ${warning.text}`
    );
  }
  output.appendLine("");

  const parts = [`created ${result.created.length}`];
  if (result.skipped.length > 0) {
    parts.push(`skipped ${result.skipped.length}`);
  }
  if (result.failed.length > 0) {
    parts.push(`failed ${result.failed.length}`);
  }
  if (parsed.warnings.length > 0) {
    parts.push(`${parsed.warnings.length} lines ignored`);
  }

  const summary = `TreeForge: ${parts.join(", ")}.`;
  const actions =
    result.failed.length > 0 ||
    result.skipped.length > 0 ||
    parsed.warnings.length > 0
      ? ["Show Details"]
      : [];

  const show = (choice?: string) => {
    if (choice === "Show Details") {
      output.show(true);
    }
  };

  if (result.failed.length > 0) {
    vscode.window.showWarningMessage(summary, ...actions).then(show);
  } else {
    vscode.window.showInformationMessage(summary, ...actions).then(show);
  }

  const reveal = vscode.workspace
    .getConfiguration("treeforge")
    .get<boolean>("revealInOSAfterCreate", false);

  if (reveal) {
    vscode.commands.executeCommand("revealFileInOS", target);
  }
}
