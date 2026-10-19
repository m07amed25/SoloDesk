import { existsSync, lstatSync, mkdirSync } from "node:fs";
import path from "node:path";
import { isWorkspaceId } from "../../shared/persistence-contracts.ts";

export type WorkspacePaths = Readonly<{
  directory: string;
  database: string;
  wal: string;
  shm: string;
  envelope: string;
  manifest: string;
  migration: string;
  attachments: string;
}>;

export function workspacePaths(
  userData: string,
  profileId: string,
  workspaceId: string,
): WorkspacePaths {
  if (!isWorkspaceId(profileId) || !isWorkspaceId(workspaceId))
    throw new Error("invalid_namespace");
  // Profile comes from F004's trusted owner. It is a physical partition in addition
  // to the key envelope's identity binding.
  const directory = path.join(userData, "workspaces", profileId, workspaceId);
  return Object.freeze({
    directory,
    database: path.join(directory, "store.db"),
    wal: path.join(directory, "store.db-wal"),
    shm: path.join(directory, "store.db-shm"),
    envelope: path.join(directory, "key.envelope"),
    manifest: path.join(directory, "store.json"),
    migration: path.join(directory, ".migration"),
    attachments: path.join(directory, "attachments"),
  });
}

export function ensurePrivateDirectories(
  userData: string,
  paths: WorkspacePaths,
): void {
  for (const item of [
    userData,
    path.join(userData, "workspaces"),
    path.dirname(paths.directory),
    paths.directory,
    paths.migration,
    paths.attachments,
  ]) {
    if (!existsSync(item)) mkdirSync(item, { recursive: false, mode: 0o700 });
    const state = lstatSync(item);
    if (!state.isDirectory() || state.isSymbolicLink())
      throw new Error("integrity_failed");
  }
}

export function assertPathComponentsSafe(userData: string, paths: WorkspacePaths): void {
  for (const item of [userData, path.join(userData, "workspaces"), path.dirname(paths.directory), paths.directory, paths.migration, paths.attachments]) {
    try {
      const state = lstatSync(item);
      if (!state.isDirectory() || state.isSymbolicLink()) throw new Error("integrity_failed");
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") continue;
      throw error;
    }
  }
}
