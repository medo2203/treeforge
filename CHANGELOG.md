# Change Log

All notable changes to the "TreeForge" extension will be documented in this file.

## [1.1.0] - 2026-08-04

### Fixed

- **Trees padded with spaces are no longer flattened.** Depth was previously counted from the number of drawing characters on a line, so `tree` output where a branch is continued with spaces rather than `│` collapsed into a single level. Nesting is now taken from the column the name starts at.
- **Existing files are no longer emptied.** Creating a structure over a folder that already contained, say, a `README.md` silently truncated it. Conflicts are now detected before anything is written, listed in the confirmation dialog, and skipped by default.
- **Paths can no longer escape the target folder.** Entries containing `..`, absolute paths or drive letters are rejected, and the creator refuses to write outside the folder you picked.
- **Tab-indented structures parse correctly.** Tabs were not counted as indentation at all, so tab-indented trees came out completely flat.
- **`TreeForge: Preview Structure` is now reachable.** The command was implemented but never declared, so it appeared in neither the Command Palette nor the context menu.
- **Prose around a pasted tree is ignored.** Lines such as "Here is the structure:" were being turned into real folders.
- **Trailing comments are stripped.** `index.js  # entry point` created a file whose name included the comment.
- **Better file and folder detection.** Extensionless files (`Dockerfile`, `Makefile`, `LICENSE`, …) were created as folders, and childless dot-folders (`.husky`, `.github`) as files.
- Entries are no longer silently reordered when their names look numeric, and repeated names are merged instead of dropped.

### Added

- Explorer context menu entry, which creates the structure directly into the folder you right-click without a second dialog.
- Settings: `treeforge.tabWidth`, `treeforge.onConflict` and `treeforge.revealInOSAfterCreate`.
- Support for ASCII trees (`|--`, `` `-- ``), markdown bullet lists, slash-separated paths (`src/components/Button.js`) and explicit folder markers (`assets.old/`).
- A TreeForge output channel listing exactly what was created, skipped, failed or ignored.
- A test suite covering the parser and the file creation behaviour.

### Changed

- Creation now uses the VS Code file system API instead of node's `fs`, so TreeForge works in remote, container and web workspaces and no longer blocks the UI.
- Confirmation is a modal dialog showing the tree, the counts and any conflicts, instead of a toast plus a leftover untitled document.
- Revealing the target folder in the OS file manager after creating is now opt-in.
- New TreeForge logo, used as the extension icon and in the readme, with a matching gallery banner colour.
- Minimum VS Code version raised to 1.85.0.

## [1.0.0] - 2025-03-20

- Initial release of TreeForge
- Support for multiple structure formats (box-drawing characters, standard tree format, indentation)
- Structure preview functionality
- Context menu integration
