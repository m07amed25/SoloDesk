export const BOUNDS = Object.freeze({
  id: "F003-bounds-v1",
  bytes: 262144,
  depth: 16,
  nodes: 4096,
  members: 64,
  array: 1000,
  scalars: 4096,
  stringBytes: 16384,
  key: 64,
  issues: 32,
  errorBytes: 16384,
  retryMs: 3600000,
});

export function unicodeSize(
  value: string,
): Readonly<{ scalars: number; bytes: number }> | null {
  let scalars = 0,
    bytes = 0;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    scalars++;
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return null;
      bytes += 4;
    } else if (c >= 0xdc00 && c <= 0xdfff) return null;
    else bytes += c < 128 ? 1 : c < 2048 ? 2 : 3;
    if (scalars > BOUNDS.scalars || bytes > BOUNDS.stringBytes) return null;
  }
  return Object.freeze({ scalars, bytes });
}

export const validKey = (v: string): boolean =>
  v.length <= BOUNDS.key &&
  /^[A-Za-z][A-Za-z0-9_]*$/.test(v) &&
  !["constructor", "prototype", "__proto__"].includes(v);

export function utf8Length(text: string): number {
  let bytes = 0;
  for (const c of text) {
    const cp = c.codePointAt(0)!;
    bytes += cp < 128 ? 1 : cp < 2048 ? 2 : cp < 65536 ? 3 : 4;
    if (bytes > BOUNDS.bytes) return bytes;
  }
  return bytes;
}
