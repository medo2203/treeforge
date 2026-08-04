# TreeForge 🌲

> Transform text structures into real folders and files with a single click

TreeForge is a VS Code extension that creates folder and file structures from text representations. It's perfect for quickly scaffolding projects, recreating structures from documentation, or setting up test environments.

![TreeForge Demo](images/tuto.gif)

## Features

- **Text to Structure**: Convert text representations of folder structures into actual folders and files
- **Multiple Formats**: Box-drawing trees (`├──` and `┣`), ASCII trees (`|--`), markdown bullet lists, and plain space or tab indentation
- **Non-destructive**: Existing files are never overwritten unless you ask for it
- **Structure Preview**: See exactly what will be created, and what already exists, before anything is written
- **Works Anywhere**: Uses the VS Code file system API, so it works in remote, container and web workspaces
- **Smart Detection**: Knows that `Dockerfile` is a file and `.github` is a folder

## Usage

1. **Input Your Structure**

   - Enter or paste a text representation of your desired folder structure
   - Select the text (optional — if nothing is selected, the whole document is used)

2. **Create the Structure**

   - Right-click and choose **TreeForge: Create Folder Structure**, or run it from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Review the preview, then confirm
   - Pick a target folder — or skip this step entirely by right-clicking a folder in the Explorer and running TreeForge from there
   - Done! Your folders and files are created

3. **Preview Only**
   - Run **TreeForge: Preview Structure** to see what would be created, including any lines TreeForge had to skip, without touching the disk

## Supported Structure Formats

TreeForge works out nesting from the column each name starts at, so all of these parse identically:

### Box-Drawing Characters (UTF-8)

```
project-root
 ┣ src
 ┃ ┣ components
 ┃ ┃ ┗ Button.js
 ┃ ┗ App.js
 ┣ package.json
 ┗ README.md
```

### Standard Tree Format

```
project-root
├── src
│   ├── components
│   │   └── Button.js
│   └── App.js
├── package.json
└── README.md
```

### ASCII Trees

```
project-root
|-- src
|   `-- App.js
`-- package.json
```

### Markdown Lists

```
- project-root
  - src
    - App.js
  - package.json
```

### Simple Indentation

Tabs or any consistent number of spaces:

```
project-root
  src
    components
      Button.js
  package.json
```

### Convenience Syntax

- `src/` — a trailing slash always means a folder, even for names like `assets.old/`
- `src/components/Button.js` — slash-separated paths expand into nested folders
- `index.js  # entry point` — trailing `#` and `//` comments are stripped
- Prose around a fenced code block is ignored, so you can paste an answer straight out of a chat window

## Extension Settings

| Setting | Default | Description |
| --- | --- | --- |
| `treeforge.tabWidth` | `4` | How many columns a tab counts for when working out nesting depth |
| `treeforge.onConflict` | `skip` | What to do when a file already exists: `skip`, `overwrite`, or `abort` |
| `treeforge.revealInOSAfterCreate` | `false` | Reveal the target folder in the OS file manager after creating |

## Installation

Install directly from the VS Code Marketplace:

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "TreeForge"
4. Click Install

## Requirements

- Visual Studio Code version 1.85.0 or higher

## Known Issues

- A childless entry with no extension and no trailing slash is assumed to be a folder. Add a `/` to be explicit, or rely on the built-in list of conventional filenames (`Dockerfile`, `Makefile`, `LICENSE`, …).
- A folder whose name ends in something that looks like an extension (`v1.2.0`, `assets.old`) is read as a file unless it has children or a trailing slash.
- Files are always created empty; TreeForge does not yet fill in contents.

## Release Notes

### 1.1.0

- Rewrote the parser: nesting is now derived from the column a name starts at, which fixes `tree` output whose branches are padded with spaces, tab-indented structures, and ASCII trees
- Existing files are no longer overwritten; conflicts are reported up front and controlled by `treeforge.onConflict`
- Names that could escape the target folder (`..`, absolute paths, drive letters) are rejected
- Registered **TreeForge: Preview Structure**, which was previously unreachable
- Added an Explorer context menu entry that creates directly into the folder you right-click
- Better file/folder detection for extensionless files and dot-folders
- Trailing comments and `tree -F` indicators are stripped from names
- Moved to the VS Code file system API, so TreeForge works in remote and web workspaces

### 1.0.0

- Initial release of TreeForge
- Support for multiple structure formats
- Preview functionality
- Context menu integration

## Feedback & Contributions

- File issues or feature requests on [GitHub](https://github.com/medo2203/treeforge/issues)
- Rate and review in the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MohamedBouzraa.treeforge)

## License

This extension is licensed under the [MIT License](LICENSE).

---

**Enjoy using TreeForge!** 🌲
