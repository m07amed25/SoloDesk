import { existsSync, lstatSync } from "node:fs";
import type { WorkspacePaths } from "./workspace-storage-paths.ts";

export type StorageProbe =
  | "uninitialized"
  | "existing"
  | "key_missing"
  | "integrity_failed";

export function probeStorage(paths: WorkspacePaths): StorageProbe {
  if (!existsSync(paths.directory)) return "uninitialized";
  if (lstatSync(paths.directory).isSymbolicLink()) return "integrity_failed";
  const database = existsSync(paths.database);
  const envelope = existsSync(paths.envelope);
  const manifest = existsSync(paths.manifest);
  for (const file of [paths.database, paths.envelope, paths.manifest]) {
    try {
      const state = lstatSync(file);
      if (state.isSymbolicLink() || !state.isFile()) return "integrity_failed";
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") continue;
      throw error;
    }
  }
  if (database && !envelope) return "key_missing";
  if (
    database &&
    envelope &&
    manifest &&
    lstatSync(paths.database).isFile() &&
    lstatSync(paths.database).size > 0 &&
    !lstatSync(paths.database).isSymbolicLink()
  )
    return "existing";
  // An existing but partial namespace is never treated as a new database.
  return "integrity_failed";
}
