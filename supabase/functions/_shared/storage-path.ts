export const CANONICAL_STORAGE_REGEX =
  /^workspaces\/(ws_[a-zA-Z0-9_-]+)\/(invoices|receipts|contracts|projects|profiles)\/([a-zA-Z0-9_-]+)\/(obj_[a-zA-Z0-9_-]+)-[a-zA-Z0-9_.-]+$/;

export type StorageEntityType =
  | "invoices"
  | "receipts"
  | "contracts"
  | "projects"
  | "profiles";

export function sanitizeFilename(filename: string): string {
  // Reject path traversal characters
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    throw new Error("Invalid filename: path traversal characters detected");
  }

  // Replace spaces or unsafe chars with underscores, keep alphanumeric, dots, hyphens
  const sanitized = filename
    .trim()
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+/, "");

  if (!sanitized || sanitized.length > 128) {
    throw new Error(
      "Invalid filename: length must be between 1 and 128 characters",
    );
  }

  return sanitized;
}

export function buildStoragePath(params: {
  workspaceId: string;
  entityType: StorageEntityType;
  entityId: string;
  fileId: string;
  filename: string;
}): string {
  if (!params.workspaceId.startsWith("ws_")) {
    throw new Error("Invalid workspaceId format");
  }
  if (!params.fileId.startsWith("obj_")) {
    throw new Error("Invalid fileId format");
  }

  const cleanFilename = sanitizeFilename(params.filename);
  const path = `workspaces/${params.workspaceId}/${params.entityType}/${params.entityId}/${params.fileId}-${cleanFilename}`;

  if (!CANONICAL_STORAGE_REGEX.test(path)) {
    throw new Error(
      `Constructed storage path fails canonical regex validation: ${path}`,
    );
  }

  return path;
}

export function parseStoragePath(storagePath: string): {
  workspaceId: string;
  entityType: StorageEntityType;
  entityId: string;
  fileId: string;
} {
  const match = storagePath.match(CANONICAL_STORAGE_REGEX);
  if (!match) {
    throw new Error(
      `Storage path does not conform to canonical taxonomy: ${storagePath}`,
    );
  }

  return {
    workspaceId: match[1],
    entityType: match[2] as StorageEntityType,
    entityId: match[3],
    fileId: match[4],
  };
}
