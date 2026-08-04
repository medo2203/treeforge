import * as vscode from "vscode";
import { ConflictPolicy, CreateResult, TreeNode } from "./types";

export interface CreateOptions {
  policy: ConflictPolicy;
  token?: vscode.CancellationToken;
  onProgress?: (label: string) => void;
}

/**
 * Thrown when the "abort" conflict policy meets an existing file
 */
export class ConflictError extends Error {
  constructor(public readonly conflict: string) {
    super(`"${conflict}" already exists`);
    this.name = "ConflictError";
  }
}

/**
 * Create the structure under `base`.
 *
 * Uses the VS Code file system API rather than node's `fs` so that this works
 * over remote, virtual and web workspaces, and never blocks the extension host.
 * Existing files are never truncated unless the caller opts into "overwrite".
 */
export async function createFolderStructure(
  nodes: TreeNode[],
  base: vscode.Uri,
  options: CreateOptions
): Promise<CreateResult> {
  const result: CreateResult = { created: [], skipped: [], failed: [] };
  await createInto(nodes, base, base, options, result);
  return result;
}

/**
 * Paths that already exist on disk, so the user can be told before anything
 * is written
 */
export async function findConflicts(
  nodes: TreeNode[],
  base: vscode.Uri
): Promise<string[]> {
  const conflicts: string[] = [];
  await collectConflicts(nodes, base, base, conflicts);
  return conflicts;
}

async function collectConflicts(
  nodes: TreeNode[],
  base: vscode.Uri,
  parent: vscode.Uri,
  conflicts: string[]
): Promise<void> {
  for (const node of nodes) {
    const target = vscode.Uri.joinPath(parent, node.name);
    const existing = await statOrNull(target);

    if (node.type === "file" && existing) {
      conflicts.push(relativeLabel(base, target));
    } else if (node.type === "directory") {
      if (existing && existing.type === vscode.FileType.File) {
        conflicts.push(relativeLabel(base, target));
      }
      await collectConflicts(node.children, base, target, conflicts);
    }
  }
}

async function createInto(
  nodes: TreeNode[],
  base: vscode.Uri,
  parent: vscode.Uri,
  options: CreateOptions,
  result: CreateResult
): Promise<void> {
  for (const node of nodes) {
    if (options.token?.isCancellationRequested) {
      return;
    }

    const target = vscode.Uri.joinPath(parent, node.name);
    const label = relativeLabel(base, target);

    // The parser already rejects "..", separators and drive letters. This is a
    // second gate so that nothing can ever be written outside the folder the
    // user picked.
    if (!isInside(base, target)) {
      result.failed.push({
        path: label,
        reason: "resolves outside the target folder",
      });
      continue;
    }

    const existing = await statOrNull(target);

    if (node.type === "directory") {
      if (existing && existing.type === vscode.FileType.File) {
        result.failed.push({
          path: label,
          reason: "a file with this name already exists",
        });
        continue;
      }

      if (existing) {
        result.skipped.push(`${label}/`);
      } else {
        try {
          await vscode.workspace.fs.createDirectory(target);
          result.created.push(`${label}/`);
          options.onProgress?.(label);
        } catch (error) {
          result.failed.push({ path: label, reason: describe(error) });
          continue;
        }
      }

      await createInto(node.children, base, target, options, result);
      continue;
    }

    if (existing) {
      if (existing.type === vscode.FileType.Directory) {
        result.failed.push({
          path: label,
          reason: "a folder with this name already exists",
        });
        continue;
      }
      if (options.policy === "abort") {
        throw new ConflictError(label);
      }
      if (options.policy === "skip") {
        result.skipped.push(label);
        continue;
      }
    }

    try {
      await vscode.workspace.fs.writeFile(target, new Uint8Array());
      result.created.push(label);
      options.onProgress?.(label);
    } catch (error) {
      result.failed.push({ path: label, reason: describe(error) });
    }
  }
}

async function statOrNull(
  uri: vscode.Uri
): Promise<vscode.FileStat | null> {
  try {
    return await vscode.workspace.fs.stat(uri);
  } catch {
    return null;
  }
}

function isInside(base: vscode.Uri, target: vscode.Uri): boolean {
  if (base.scheme !== target.scheme || base.authority !== target.authority) {
    return false;
  }
  const root = base.path.endsWith("/") ? base.path : `${base.path}/`;
  return target.path.startsWith(root);
}

function relativeLabel(base: vscode.Uri, target: vscode.Uri): string {
  const root = base.path.endsWith("/") ? base.path : `${base.path}/`;
  return target.path.startsWith(root)
    ? decodeURIComponent(target.path.slice(root.length))
    : decodeURIComponent(target.path);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
