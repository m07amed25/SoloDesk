import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { KeyContext } from "./key-provider.ts";
import type { ProtectedStagedFile } from "./types.ts";

const MAGIC = Buffer.from("SDF1");
const digest = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const aad = (context: KeyContext, fileId: string) =>
  Buffer.from(
    JSON.stringify([
      context.identityBindingId,
      context.dataSetId,
      context.generation,
      fileId,
    ]),
    "utf8",
  );
function name(fileId: string): string {
  if (!/^[0-9a-f-]{36}$/.test(fileId)) throw new Error("protection_denied");
  return `${fileId}.stage`;
}

export async function sealStagedFile(
  dir: string,
  key: Buffer,
  context: KeyContext,
  bytes: Buffer,
): Promise<ProtectedStagedFile> {
  if (key.length !== 32 || !Buffer.isBuffer(bytes))
    throw new Error("protection_denied");
  const fileId = randomUUID();
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(aad(context, fileId));
  const sealed = Buffer.concat([
    MAGIC,
    nonce,
    cipher.update(bytes),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  await writeFile(path.join(dir, name(fileId)), sealed, {
    flag: "wx",
    mode: 0o600,
  });
  const meta: ProtectedStagedFile = Object.freeze({
    fileId,
    ...context,
    lifecycle: "sealed" as const,
    byteCount: bytes.length,
    expectedDigest: digest(bytes),
  });
  await writeFile(
    path.join(dir, `${fileId}.stage.meta`),
    JSON.stringify(meta),
    {
      flag: "wx",
      mode: 0o600,
    },
  );
  return meta;
}

export async function openStagedFile(
  dir: string,
  key: Buffer,
  context: KeyContext,
  file: ProtectedStagedFile,
): Promise<Buffer> {
  if (
    key.length !== 32 ||
    file.lifecycle !== "sealed" ||
    file.identityBindingId !== context.identityBindingId ||
    file.dataSetId !== context.dataSetId ||
    file.generation !== context.generation
  )
    throw new Error("protection_denied");
  const sealed = await readFile(path.join(dir, name(file.fileId)));
  if (sealed.length < 32 || !sealed.subarray(0, 4).equals(MAGIC))
    throw new Error("integrity_failed");
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      sealed.subarray(4, 16),
    );
    decipher.setAAD(aad(context, file.fileId));
    decipher.setAuthTag(sealed.subarray(-16));
    const bytes = Buffer.concat([
      decipher.update(sealed.subarray(16, -16)),
      decipher.final(),
    ]);
    if (
      bytes.length !== file.byteCount ||
      digest(bytes) !== file.expectedDigest
    )
      throw new Error("integrity_failed");
    return bytes;
  } catch {
    throw new Error("integrity_failed");
  }
}
