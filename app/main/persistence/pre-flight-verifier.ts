import { statSync, statfsSync } from "node:fs";
import type { WorkspacePaths } from "./workspace-storage-paths.ts";

export const MIGRATION_BUFFER_BYTES = 50 * 1024 * 1024;
export const APP_SCHEMA_VERSION = 1;

export function requiredMigrationSpace(
  databaseBytes: number,
  walBytes: number,
): number {
  if (
    ![databaseBytes, walBytes].every((n) => Number.isSafeInteger(n) && n >= 0)
  )
    throw new Error("integrity_failed");
  return 2 * (databaseBytes + walBytes) + MIGRATION_BUFFER_BYTES;
}

export function assertSupportedVersion(
  current: number,
  supported = APP_SCHEMA_VERSION,
): void {
  if (!Number.isSafeInteger(current) || current < 0)
    throw new Error("integrity_failed");
  if (current > supported) throw new Error("unsupported_future_version");
}

export function verifyMigrationSpace(
  paths: WorkspacePaths,
  availableOverride?: number,
): { required: number; available: number } {
  const size = (file: string) => {
    try {
      return statSync(file).size;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      )
        return 0;
      throw error;
    }
  };
  const required = requiredMigrationSpace(
    size(paths.database),
    size(paths.wal),
  );
  const volume = statfsSync(paths.directory);
  const available = availableOverride ?? volume.bavail * volume.bsize;
  if (available < required)
    throw Object.assign(new Error("disk_full"), { required, available });
  return { required, available };
}
