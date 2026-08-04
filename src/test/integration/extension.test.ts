import * as assert from "assert";
import * as vscode from "vscode";

suite("TreeForge extension", () => {
  suiteSetup(async () => {
    const extension = vscode.extensions.getExtension(
      "MohamedBouzraa.treeforge"
    );
    assert.ok(extension, "extension was not found");
    await extension.activate();
  });

  test("activates and registers both commands", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("treeforge.create"),
      "treeforge.create is not registered"
    );
    assert.ok(
      commands.includes("treeforge.preview"),
      "treeforge.preview is not registered"
    );
  });

  test("contributes its settings", () => {
    const config = vscode.workspace.getConfiguration("treeforge");
    assert.strictEqual(config.get("onConflict"), "skip");
    assert.strictEqual(config.get("tabWidth"), 4);
    assert.strictEqual(config.get("revealInOSAfterCreate"), false);
  });
});
