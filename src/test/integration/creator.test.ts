import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { createFolderStructure, findConflicts } from "../../creator";
import { parseStructure } from "../../parser";
import { TreeNode } from "../../types";

function scratch(): vscode.Uri {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "treeforge-"));
  return vscode.Uri.file(dir);
}

suite("creator", () => {
  test("creates the parsed structure on disk", async () => {
    const base = scratch();
    const { nodes } = parseStructure(
      ["root", "  src", "    index.ts", "  Dockerfile", "  .github"].join("\n")
    );

    const result = await createFolderStructure(nodes, base, { policy: "skip" });

    assert.deepStrictEqual(result.failed, []);
    assert.ok(fs.statSync(path.join(base.fsPath, "root/src")).isDirectory());
    assert.ok(fs.statSync(path.join(base.fsPath, "root/src/index.ts")).isFile());
    assert.ok(fs.statSync(path.join(base.fsPath, "root/Dockerfile")).isFile());
    assert.ok(fs.statSync(path.join(base.fsPath, "root/.github")).isDirectory());
  });

  test("does not truncate an existing file", async () => {
    const base = scratch();
    const existing = path.join(base.fsPath, "README.md");
    fs.writeFileSync(existing, "do not lose me");

    const { nodes } = parseStructure("README.md\nnew.txt");
    const result = await createFolderStructure(nodes, base, { policy: "skip" });

    assert.strictEqual(fs.readFileSync(existing, "utf8"), "do not lose me");
    assert.deepStrictEqual(result.skipped, ["README.md"]);
    assert.deepStrictEqual(result.created, ["new.txt"]);
  });

  test("overwrite policy empties the file, and only when asked", async () => {
    const base = scratch();
    const existing = path.join(base.fsPath, "README.md");
    fs.writeFileSync(existing, "replace me");

    const { nodes } = parseStructure("README.md");
    await createFolderStructure(nodes, base, { policy: "overwrite" });

    assert.strictEqual(fs.readFileSync(existing, "utf8"), "");
  });

  test("reports a file blocking a folder instead of destroying it", async () => {
    const base = scratch();
    fs.writeFileSync(path.join(base.fsPath, "src"), "i am a file");

    const { nodes } = parseStructure("src/\n  a.js");
    const result = await createFolderStructure(nodes, base, { policy: "skip" });

    assert.strictEqual(result.failed.length, 1);
    assert.match(result.failed[0].reason, /file with this name already exists/);
    assert.strictEqual(fs.readFileSync(path.join(base.fsPath, "src"), "utf8"), "i am a file");
  });

  test("refuses to write outside the target folder", async () => {
    const base = scratch();
    // The parser never emits "..", but the creator is the last line of defence.
    const nodes: TreeNode[] = [
      { name: "..", type: "directory", children: [
        { name: "escaped.txt", type: "file", children: [] },
      ] },
    ];

    const result = await createFolderStructure(nodes, base, { policy: "skip" });

    assert.strictEqual(result.created.length, 0);
    assert.strictEqual(result.failed.length, 1);
    assert.match(result.failed[0].reason, /outside the target folder/);
    assert.ok(!fs.existsSync(path.join(path.dirname(base.fsPath), "escaped.txt")));
  });

  test("findConflicts reports what already exists before anything is written", async () => {
    const base = scratch();
    fs.mkdirSync(path.join(base.fsPath, "src"), { recursive: true });
    fs.writeFileSync(path.join(base.fsPath, "src", "index.ts"), "existing");

    const { nodes } = parseStructure("src/\n  index.ts\n  other.ts");
    const conflicts = await findConflicts(nodes, base);

    assert.deepStrictEqual(conflicts, ["src/index.ts"]);
  });
});
