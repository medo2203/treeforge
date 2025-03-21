import * as vscode from "vscode";
import { parseFolderStructure } from "./parser";
import { createFolderStructure } from "./creator";
import { showStructurePreview } from "./previewer";
import { FolderStructure } from "./types";

export function activate(context: vscode.ExtensionContext) {
  console.log("TreeForge is now active");

  // Register the main command
  let createCommand = vscode.commands.registerCommand(
    "treeforge.create",
    async () => {
      await createStructureFromText();
    }
  );

  // Register a command to preview the structure
  let previewCommand = vscode.commands.registerCommand(
    "treeforge.preview",
    async () => {
      await previewStructure();
    }
  );

  context.subscriptions.push(createCommand, previewCommand);
}

/**
 * Create folder structure from text in the active editor
 */
async function createStructureFromText(): Promise<void> {
  // Get the input from the user
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor found");
    return;
  }

  const document = editor.document;
  const selection = editor.selection;
  let text: string;

  // If there's a selection, use it. Otherwise use the entire document
  if (!selection.isEmpty) {
    text = document.getText(selection);
  } else {
    text = document.getText();
  }

  if (!text) {
    vscode.window.showErrorMessage("No text to parse");
    return;
  }

  // Parse the folder structure
  const structure: FolderStructure = parseFolderStructure(text);

  // Show a preview and get confirmation
  const previewResult = await showStructurePreview(structure);

  if (previewResult === "cancel") {
    return;
  }

  // Ask the user where to create the folder structure
  const targetFolder = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: "Select target location",
  });

  if (!targetFolder || targetFolder.length === 0) {
    return;
  }

  const basePath = targetFolder[0].fsPath;

  // Create the folders and files
  try {
    await createFolderStructure(structure, basePath);
    vscode.window.showInformationMessage(
      "Folder structure created successfully!"
    );

    // Open the target folder in Explorer
    vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(basePath));
  } catch (err) {
    if (err instanceof Error) {
      vscode.window.showErrorMessage(
        `Failed to create folder structure: ${err.message}`
      );
    } else {
      vscode.window.showErrorMessage(
        "Failed to create folder structure: Unknown error"
      );
    }
  }
}

/**
 * Preview the structure in a new editor tab
 */
async function previewStructure(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor found");
    return;
  }

  const document = editor.document;
  const selection = editor.selection;
  let text: string;

  if (!selection.isEmpty) {
    text = document.getText(selection);
  } else {
    text = document.getText();
  }

  if (!text) {
    vscode.window.showErrorMessage("No text to parse");
    return;
  }

  const structure = parseFolderStructure(text);
  await showStructurePreview(structure);
}

export function deactivate() {}
