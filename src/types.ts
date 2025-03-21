/**
 * Represents a folder structure where keys are file/folder names
 * and values are either null (for files) or nested structures (for folders)
 */
export interface FolderStructure {
  [key: string]: FolderStructure | null;
}

/**
 * Count of files and folders in a structure
 */
export interface StructureCounts {
  files: number;
  folders: number;
}

/**
 * Result of a preview operation
 */
export type PreviewResult = "confirm" | "cancel";
