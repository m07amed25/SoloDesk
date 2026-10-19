import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const surfaceFor = (name) => {
  if (/(?:^|[./_-])(?:wal|journal|shm)(?:$|[./_-])/i.test(name)) return "journal";
  if (/(?:^|[./_-])(?:temp|tmp)(?:$|[./_-])/i.test(name)) return "temp";
  if (/(?:^|[./_-])(?:stage|staging|attachment)(?:$|[./_-])/i.test(name)) return "staging";
  if (/(?:^|[./_-])(?:rotat|candidate|previous)(?:$|[./_-])/i.test(name)) return "rotation";
  if (/(?:^|[./_-])(?:crash|abandon|residue)(?:$|[./_-])/i.test(name)) return "crash_residue";
  if (/(?:^|[./_-])(?:index|fts)(?:$|[./_-])/i.test(name)) return "index";
  return "database_or_other";
};

/** Inventory every app-owned regular file; no path or matched content leaves this function. */
export async function inventoryFiles(root, markers = []) {
  const found = [];
  const visit = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const stat = await lstat(full);
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) { await visit(full); continue; }
      if (!stat.isFile()) continue;
      const bytes = await readFile(full);
      found.push(Object.freeze({
        surface: surfaceFor(path.relative(root, full)),
        bytes: bytes.length,
        digest: digest(bytes),
        markerCount: markers.filter((marker) => Buffer.isBuffer(marker) && marker.length > 0 && bytes.includes(marker)).length,
      }));
    }
  };
  await visit(root);
  return Object.freeze(found.sort((a, b) => a.surface.localeCompare(b.surface) || a.digest.localeCompare(b.digest)));
}
