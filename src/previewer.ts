import * as vscode from "vscode";
import { ParseResult, PreviewResult } from "./types";
import { countFilesAndFolders, renderStructurePreview } from "./parser";

/** Lines of tree to show inside the confirmation dialog before truncating */
const MAX_DIALOG_LINES = 30;

/**
 * Ask the user to confirm, showing the tree, the counts, anything the parser
 * had to skip, and anything that already exists at the target.
 *
 * This is a modal dialog rather than the toast v1.0 used, so that dismissing it
 * by accident cannot be mistaken for a decision, and so that no untitled
 * document is left behind.
 */
export async function confirmCreation(
  parsed: ParseResult,
  conflicts: string[],
  target: vscode.Uri
): Promise<PreviewResult> {
  const counts = countFilesAndFolders(parsed.nodes);
  const tree = renderStructurePreview(parsed.nodes).trimEnd().split("\n");

  const shown = tree.slice(0, MAX_DIALOG_LINES).join("\n");
  const hidden = tree.length - MAX_DIALOG_LINES;

  let detail = shown;
  if (hidden > 0) {
    detail += `\n… and ${hidden} more ${hidden === 1 ? "entry" : "entries"}`;
  }

  detail += `\n\nInto: ${target.fsPath}`;
  detail += `\nCreates ${counts.folders} ${
    counts.folders === 1 ? "folder" : "folders"
  } and ${counts.files} ${counts.files === 1 ? "file" : "files"}.`;

  if (conflicts.length > 0) {
    const listed = conflicts.slice(0, 5).join(", ");
    const more = conflicts.length > 5 ? `, +${conflicts.length - 5} more` : "";
    detail += `\n\nAlready exists (left untouched): ${listed}${more}`;
  }

  if (parsed.warnings.length > 0) {
    detail += `\n\n${parsed.warnings.length} ${
      parsed.warnings.length === 1 ? "line was" : "lines were"
    } skipped. Run "TreeForge: Preview Structure" for details.`;
  }

  const choice = await vscode.window.showInformationMessage(
    "Create this structure?",
    { modal: true, detail },
    "Create"
  );

  return choice === "Create" ? "confirm" : "cancel";
}

/**
 * Open the parsed structure as a markdown document, without creating anything
 */
export async function openStructurePreview(
  parsed: ParseResult
): Promise<void> {
  const counts = countFilesAndFolders(parsed.nodes);

  let content = "# TreeForge Structure Preview\n\n";
  content += "```\n";
  content += renderStructurePreview(parsed.nodes) || "(nothing to create)\n";
  content += "```\n\n";
  content += `This would create ${counts.folders} ${
    counts.folders === 1 ? "folder" : "folders"
  } and ${counts.files} ${counts.files === 1 ? "file" : "files"}.\n`;

  if (parsed.warnings.length > 0) {
    content += "\n## Skipped lines\n\n";
    for (const warning of parsed.warnings) {
      content += `- Line ${warning.line}: ${warning.message} — \`${warning.text}\`\n`;
    }
  }

  content += "\n---\n";
  content +=
    "TreeForge — created by Mohamed Bouzraa ([@medo2203](https://github.com/medo2203))\n";

  const document = await vscode.workspace.openTextDocument({
    content,
    language: "markdown",
  });

  await vscode.window.showTextDocument(document, { preview: true });
}
