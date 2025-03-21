# TreeForge 🌲

> Transform text structures into real folders and files with a single click

TreeForge is a VS Code extension that creates folder and file structures from text representations. It's perfect for quickly scaffolding projects, recreating structures from documentation, or setting up test environments.

![TreeForge Demo](images/demo.gif)

## Features

- **Text to Structure**: Convert text representations of folder structures into actual folders and files
- **Multiple Formats**: Support for indentation-based formats and tree visualization characters (┣, ┃, ┗, etc.)
- **Structure Preview**: Preview the structure before creating it
- **Simple Interface**: Right-click and select from the context menu to create or preview
- **Smart Detection**: Automatically detect files vs folders

## Usage

1. **Input Your Structure**:

   - Enter or paste a text representation of your desired folder structure
   - Select the text (optional - if not selected, the entire document will be used)

2. **Create Structure**:

   - Right-click and select "TreeForge: Create Folder Structure"
   - Or use the Command Palette (Ctrl+Shift+P) and search for "TreeForge"
   - Preview the structure and confirm
   - Select a target location
   - Done! Your folders and files are created

3. **Preview Only**:
   - Right-click and select "TreeForge: Preview Structure"
   - See what will be created without actually creating anything

## Supported Structure Formats

TreeForge supports multiple ways to represent folder structures:

### Box-Drawing Characters (UTF-8)

```
project-root
 ┣ src
 ┃ ┣ components
 ┃ ┃ ┗ Button.js
 ┃ ┣ utils
 ┃ ┃ ┗ helpers.js
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
 │   ├── utils
 │   │   └── helpers.js
 │   └── App.js
 ├── package.json
 └── README.md
```

### Simple Indentation

```
project-root
  src
    components
      Button.js
    utils
      helpers.js
    App.js
  package.json
  README.md
```

## Installation

Install directly from the VS Code Marketplace:

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "TreeForge"
4. Click Install

## Requirements

- Visual Studio Code version 1.60.0 or higher

## Extension Settings

This extension doesn't add any VS Code settings yet.

## Known Issues

- Very complex folder structures with irregular indentation might not parse correctly
- File detection is based on file extensions, so files without extensions might be detected as folders

## Release Notes

### 1.0.0

- Initial release of TreeForge
- Support for multiple structure formats
- Preview functionality
- Context menu integration

## Feedback & Contributions

- File issues or feature requests on [GitHub](https://github.com/YOUR_USERNAME/treeforge)
- Rate and review in the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=YOUR_PUBLISHER_ID.treeforge)

## License

This extension is licensed under the [MIT License](LICENSE).

---

**Enjoy using TreeForge!** 🌲
