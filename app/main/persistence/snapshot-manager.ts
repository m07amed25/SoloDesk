import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import {
  chmod,
  lstat,
  readdir,
  readFile,
  rename,
  stat,
  writeFile,
  rm,
} from "node:fs/promises";
import path from "node:path";
import type { DatabaseConnection } from "./database-connection.ts";
import type { WorkspacePaths } from "./workspace-storage-paths.ts";

export type SafetySnapshot = Readonly<{
  file: string;
  checksum: string;
  bytes: number;
  from: number;
  to: number;
}>;

async function digest(file: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function privateCopy(source: string, destination: string): Promise<void> {
  try {
    await pipeline(createReadStream(source), createWriteStream(destination, { flags: "wx", mode: 0o600 }));
    await chmod(destination, 0o600);
  } catch (error) {
    await rm(destination, { force: true });
    throw error;
  }
}

export async function createSnapshot(
  connection: DatabaseConnection,
  paths: WorkspacePaths,
  from: number,
  to: number,
): Promise<SafetySnapshot> {
  connection.checkpoint();
  const file = path.join(
    paths.migration,
    `pre-migration-v${from}-${randomUUID()}.snapshot`,
  );
  await privateCopy(paths.database, file);
  const [source, snapshot, checksum] = await Promise.all([
    stat(paths.database),
    stat(file),
    digest(file),
  ]);
  if (source.size !== snapshot.size) {
    await rm(file, { force: true });
    throw new Error("integrity_failed");
  }
  const result = { file, checksum, bytes: snapshot.size, from, to };
  await writeFile(`${file}.json`, JSON.stringify(result), {
    flag: "wx",
    mode: 0o600,
  });
  return result;
}

export async function verifySnapshot(
  paths: WorkspacePaths,
  file: string,
): Promise<SafetySnapshot> {
  if (
    path.dirname(file) !== paths.migration ||
    !path.basename(file).endsWith(".snapshot")
  )
    throw new Error("integrity_failed");
  const fileInfo = await lstat(file);
  const manifestInfo = await lstat(`${file}.json`);
  if (!fileInfo.isFile() || fileInfo.isSymbolicLink() || !manifestInfo.isFile() || manifestInfo.isSymbolicLink())
    throw new Error("integrity_failed");
  const snapshot = JSON.parse(
    await readFile(`${file}.json`, "utf8"),
  ) as SafetySnapshot;
  const info = await stat(file);
  if (
    snapshot.file !== file ||
    snapshot.bytes !== info.size ||
    snapshot.checksum !== (await digest(file))
  )
    throw new Error("integrity_failed");
  return snapshot;
}

/** Retain the newest encrypted safety copy for the following verified session. */
export async function retainLatestSnapshot(paths: WorkspacePaths): Promise<void> {
  const files = (await readdir(paths.migration)).filter((name) => name.endsWith(".snapshot"));
  const stamped = await Promise.all(files.map(async (name) => ({
    file: path.join(paths.migration, name),
    time: (await lstat(path.join(paths.migration, name))).mtimeMs,
  })));
  stamped.sort((a, b) => b.time - a.time);
  for (const entry of stamped.slice(1)) {
    await rm(entry.file, { force: true });
    await rm(`${entry.file}.json`, { force: true });
  }
}

export async function restoreSnapshot(
  paths: WorkspacePaths,
  snapshot: SafetySnapshot,
): Promise<void> {
  await verifySnapshot(paths, snapshot.file);
  const staging = path.join(paths.migration, `restore-${randomUUID()}.tmp`);
  try {
    await privateCopy(snapshot.file, staging);
    if ((await digest(staging)) !== snapshot.checksum)
      throw new Error("integrity_failed");
    await rm(paths.wal, { force: true });
    await rm(paths.shm, { force: true });
    await rename(staging, paths.database);
  } finally {
    await rm(staging, { force: true });
  }
}
