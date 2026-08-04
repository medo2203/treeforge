/**
 * Whether a parsed entry should become a file or a directory on disk
 */
export type NodeType = "file" | "directory";

/**
 * A single entry in a parsed structure. Children are kept in an array so that
 * the order the user wrote them in is always preserved.
 */
export interface TreeNode {
  name: string;
  type: NodeType;
  children: TreeNode[];
}

/**
 * A line the parser could not use, or used in a way worth telling the user about
 */
export interface ParseWarning {
  line: number;
  message: string;
  text: string;
}

/**
 * The outcome of parsing a block of text
 */
export interface ParseResult {
  nodes: TreeNode[];
  warnings: ParseWarning[];
}

/**
 * Count of files and folders in a structure
 */
export interface StructureCounts {
  files: number;
  folders: number;
}

/**
 * What to do when a file we want to create already exists on disk
 */
export type ConflictPolicy = "skip" | "overwrite" | "abort";

/**
 * Summary of what actually happened on disk
 */
export interface CreateResult {
  created: string[];
  skipped: string[];
  failed: { path: string; reason: string }[];
}

/**
 * Result of a preview operation
 */
export type PreviewResult = "confirm" | "cancel";
