import * as fs from "fs";
import * as path from "path";
import { FolderStructure } from "./types";

/**
 * Create the folder structure on disk
 */
export async function createFolderStructure(
  structure: FolderStructure,
  basePath: string
): Promise<void> {
  const entries = Object.entries(structure);

  for (const [name, children] of entries) {
    const fullPath = path.join(basePath, name);

    if (children === null) {
      // This is a file
      const dirPath = path.dirname(fullPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Create an empty file
      fs.writeFileSync(fullPath, "");
    } else {
      // This is a directory
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }

      // Process children
      await createFolderStructure(children, fullPath);
    }
  }
}
