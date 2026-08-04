import * as assert from "assert";
import {
  classifyLeaf,
  countFilesAndFolders,
  parseStructure,
  renderStructurePreview,
} from "../../parser";
import { TreeNode } from "../../types";

/** Flatten a tree into "a/b/c" strings, folders keeping a trailing slash */
function paths(nodes: TreeNode[], prefix = ""): string[] {
  const out: string[] = [];
  for (const node of nodes) {
    out.push(prefix + node.name + (node.type === "directory" ? "/" : ""));
    out.push(...paths(node.children, `${prefix}${node.name}/`));
  }
  return out;
}

function parsePaths(text: string): string[] {
  return paths(parseStructure(text).nodes);
}

suite("parser — formats", () => {
  test("heavy box drawing characters", () => {
    assert.deepStrictEqual(
      parsePaths(
        [
          "project-root",
          " ┣ src",
          " ┃ ┣ components",
          " ┃ ┃ ┗ Button.js",
          " ┃ ┗ App.js",
          " ┣ package.json",
          " ┗ README.md",
        ].join("\n")
      ),
      [
        "project-root/",
        "project-root/src/",
        "project-root/src/components/",
        "project-root/src/components/Button.js",
        "project-root/src/App.js",
        "project-root/package.json",
        "project-root/README.md",
      ]
    );
  });

  test("light box drawing characters", () => {
    assert.deepStrictEqual(
      parsePaths(
        [
          "project-root",
          " ├── src",
          " │   ├── components",
          " │   │   └── Button.js",
          " │   └── App.js",
          " └── package.json",
        ].join("\n")
      ),
      [
        "project-root/",
        "project-root/src/",
        "project-root/src/components/",
        "project-root/src/components/Button.js",
        "project-root/src/App.js",
        "project-root/package.json",
      ]
    );
  });

  test("`tree` output where continuation is spaces, not pipes", () => {
    // v1.0 flattened this: it counted drawing characters, so every one of these
    // lines scored the same depth.
    assert.deepStrictEqual(
      parsePaths(
        [
          "└── root",
          "    ├── src",
          "    │   └── deep",
          "    │       └── x.js",
          "    └── pkg.json",
        ].join("\n")
      ),
      [
        "root/",
        "root/src/",
        "root/src/deep/",
        "root/src/deep/x.js",
        "root/pkg.json",
      ]
    );
  });

  test("ASCII trees", () => {
    assert.deepStrictEqual(
      parsePaths(
        ["root", "|-- src", "|   `-- a.js", "`-- b.js"].join("\n")
      ),
      ["root/", "root/src/", "root/src/a.js", "root/b.js"]
    );
  });

  test("markdown bullet lists", () => {
    assert.deepStrictEqual(
      parsePaths(["- root", "  - src", "    - a.js"].join("\n")),
      ["root/", "root/src/", "root/src/a.js"]
    );
  });

  test("tab indentation", () => {
    assert.deepStrictEqual(
      parsePaths(
        ["root", "\tsrc", "\t\tcomponents", "\t\t\ta.js", "\tpkg.json"].join(
          "\n"
        )
      ),
      [
        "root/",
        "root/src/",
        "root/src/components/",
        "root/src/components/a.js",
        "root/pkg.json",
      ]
    );
  });

  test("two, three and four space indentation all nest the same", () => {
    const expected = ["root/", "root/src/", "root/src/a.js"];
    for (const width of [2, 3, 4]) {
      const pad = (level: number) => " ".repeat(width * level);
      assert.deepStrictEqual(
        parsePaths(`root\n${pad(1)}src\n${pad(2)}a.js`),
        expected,
        `failed at ${width}-space indentation`
      );
    }
  });

  test("CRLF line endings", () => {
    assert.deepStrictEqual(parsePaths("root\r\n  src\r\n    a.js\r\n"), [
      "root/",
      "root/src/",
      "root/src/a.js",
    ]);
  });

  test("rendered output can be parsed back into the same tree", () => {
    const source = [
      "root",
      " ├── src",
      " │   ├── deep",
      " │   │   └── x.js",
      " │   └── App.js",
      " └── pkg.json",
    ].join("\n");

    const first = parseStructure(source).nodes;
    const second = parseStructure(renderStructurePreview(first)).nodes;

    assert.deepStrictEqual(paths(second), paths(first));
  });
});

suite("parser — names", () => {
  test("trailing comments are stripped", () => {
    assert.deepStrictEqual(
      parsePaths(
        ["root", "  src/          # source code", "  index.js  // entry"].join(
          "\n"
        )
      ),
      ["root/", "root/src/", "root/index.js"]
    );
  });

  test("a hash inside a name is kept", () => {
    assert.deepStrictEqual(parsePaths("root\n  issue#3.md"), [
      "root/",
      "root/issue#3.md",
    ]);
  });

  test("names beginning with + or - survive", () => {
    assert.deepStrictEqual(
      parsePaths(["routes", "  +page.svelte", "  -draft.md"].join("\n")),
      ["routes/", "routes/+page.svelte", "routes/-draft.md"]
    );
  });

  test("slash-separated paths expand into nested folders", () => {
    assert.deepStrictEqual(parsePaths("src/components/Button.js"), [
      "src/",
      "src/components/",
      "src/components/Button.js",
    ]);
  });

  test("repeated names are merged rather than duplicated", () => {
    assert.deepStrictEqual(
      parsePaths(["root", "  src", "    a.js", "  src", "    b.js"].join("\n")),
      ["root/", "root/src/", "root/src/a.js", "root/src/b.js"]
    );
  });

  test("a trailing slash forces a folder even when it looks like a file", () => {
    assert.deepStrictEqual(parsePaths("root\n  assets.old/"), [
      "root/",
      "root/assets.old/",
    ]);
  });

  test("`tree -F` type indicators are stripped", () => {
    assert.deepStrictEqual(parsePaths("root/\n  build.sh*\n  link@"), [
      "root/",
      "root/build.sh",
      "root/link/",
    ]);
  });

  test("declaration order is preserved for numeric names", () => {
    assert.deepStrictEqual(
      parsePaths(["logs", "  2024", "  2023", "  2025"].join("\n")),
      ["logs/", "logs/2024/", "logs/2023/", "logs/2025/"]
    );
  });
});

suite("parser — file or folder", () => {
  test("extensionless conventional files are files", () => {
    assert.deepStrictEqual(
      parsePaths(
        ["root", "  Dockerfile", "  Makefile", "  LICENSE", "  Procfile"].join(
          "\n"
        )
      ),
      [
        "root/",
        "root/Dockerfile",
        "root/Makefile",
        "root/LICENSE",
        "root/Procfile",
      ]
    );
  });

  test("known dot-folders are folders even with no children", () => {
    assert.deepStrictEqual(
      parsePaths(["root", "  .husky", "  .github", "  .gitignore"].join("\n")),
      ["root/", "root/.husky/", "root/.github/", "root/.gitignore"]
    );
  });

  test("anything with children is a folder", () => {
    assert.deepStrictEqual(parsePaths("root\n  app.config\n    a.js"), [
      "root/",
      "root/app.config/",
      "root/app.config/a.js",
    ]);
  });

  test("classifyLeaf covers the common cases", () => {
    assert.strictEqual(classifyLeaf("index.ts"), "file");
    assert.strictEqual(classifyLeaf("Dockerfile"), "file");
    assert.strictEqual(classifyLeaf("dockerfile.dev"), "file");
    assert.strictEqual(classifyLeaf(".env"), "file");
    assert.strictEqual(classifyLeaf(".vscode"), "directory");
    assert.strictEqual(classifyLeaf("components"), "directory");
  });
});

suite("parser — hostile and noisy input", () => {
  test("parent directory traversal is rejected", () => {
    const result = parseStructure("../../evil\n  ok.txt");
    assert.deepStrictEqual(paths(result.nodes), []);
    assert.strictEqual(result.warnings.length, 1);
    assert.match(result.warnings[0].message, /not a valid name/);
  });

  test("traversal buried in a path segment is rejected", () => {
    const result = parseStructure("src/../../evil.txt");
    assert.deepStrictEqual(paths(result.nodes), []);
    assert.strictEqual(result.warnings.length, 1);
  });

  test("absolute paths are made relative and reported", () => {
    const result = parseStructure("/etc/nginx/nginx.conf");
    assert.deepStrictEqual(paths(result.nodes), [
      "etc/",
      "etc/nginx/",
      "etc/nginx/nginx.conf",
    ]);
    assert.strictEqual(result.warnings.length, 1);
    assert.match(result.warnings[0].message, /made relative/);
  });

  test("children of a rejected path are dropped, not promoted", () => {
    const result = parseStructure("../../evil\n  ok.txt\n  nested\n    deep.txt");
    assert.deepStrictEqual(paths(result.nodes), []);
  });

  test("prose around a fenced block is ignored", () => {
    const result = parseStructure(
      [
        "Sure, here is the structure:",
        "```",
        "root",
        "  src",
        "    a.js",
        "```",
        "This will create 2 folders and 1 file.",
      ].join("\n")
    );
    assert.deepStrictEqual(paths(result.nodes), [
      "root/",
      "root/src/",
      "root/src/a.js",
    ]);
  });

  test("prose without a fence is skipped and reported", () => {
    const result = parseStructure(
      ["Here is the structure:", "root", "  a.js"].join("\n")
    );
    assert.deepStrictEqual(paths(result.nodes), ["root/", "root/a.js"]);
    assert.strictEqual(result.warnings.length, 1);
  });

  test("empty input yields nothing rather than throwing", () => {
    assert.deepStrictEqual(parseStructure("").nodes, []);
    assert.deepStrictEqual(parseStructure("\n\n  \n").nodes, []);
  });
});

suite("counts", () => {
  test("files and folders are counted separately", () => {
    const { nodes } = parseStructure(
      ["root", "  src", "    a.js", "    b.js", "  README.md"].join("\n")
    );
    assert.deepStrictEqual(countFilesAndFolders(nodes), {
      files: 3,
      folders: 2,
    });
  });
});
