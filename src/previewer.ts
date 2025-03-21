import * as vscode from "vscode";
import { FolderStructure, PreviewResult } from "./types";
import { countFilesAndFolders, renderStructurePreview } from "./parser";

/**
 * Show a preview of the structure in a new editor tab
 */
export async function showStructurePreview(
  structure: FolderStructure
): Promise<PreviewResult> {
  // Create a pretty representation of the structure
  let preview = "# TreeForge Structure Preview\n\n";
  preview += "```\n";
  preview += renderStructurePreview(structure);
  preview += "```\n\n";

  // Count the files and folders
  const counts = countFilesAndFolders(structure);
  preview += `This will create ${counts.folders} folders and ${counts.files} files.\n\n`;

  // Add buttons for confirmation
  preview +=
    'Click "Proceed with Creation" to select a target location, or close this tab to cancel.\n\n';

  // Add credit to the author
  preview += "---\n";
  preview +=
    "TreeForge - Created by Mohamed Bouzraa ([@medo2203](https://github.com/medo2203))\n";

  // Create a new untitled document with the preview
  const document = await vscode.workspace.openTextDocument({
    content: preview,
    language: "markdown",
  });

  await vscode.window.showTextDocument(document);

  // Add buttons to the editor using notifications
  return new Promise<PreviewResult>((resolve) => {
    vscode.window
      .showInformationMessage(
        "TreeForge Preview - Ready to create this structure?",
        "Proceed with Creation",
        "Cancel"
      )
      .then((selection) => {
        if (selection === "Proceed with Creation") {
          resolve("confirm");
        } else {
          resolve("cancel");
        }
      });
  });
}
