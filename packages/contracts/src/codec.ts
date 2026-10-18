import { ok, fail, type Result } from "../../domain/src/integers.ts";
import type { Utf8Codec } from "./ports.ts";
import { plainData, type Data } from "./validation.ts";
import { BOUNDS, unicodeSize, validKey } from "./bounds.ts";
export function decode(bytes: unknown, codec: Utf8Codec): Result<Data> {
  if (!(bytes instanceof Uint8Array)) return fail("invalid_type");
  if (bytes.byteLength > BOUNDS.bytes) return fail("out_of_range");
  try {
    const source = codec.decode(bytes);

    let at = 0,
      nodes = 0;

    const whitespace = () => {
      while (at < source.length && [" ", "\t", "\n", "\r"].includes(source[at]))
        at++;
    };

    const error = () => {
      throw new Error("invalid");
    };

    function string(): string {
      const start = at++;
      let escaped = false;

      while (at < source.length) {
        const c = source[at++];

        if (escaped) {
          escaped = false;
          continue;
        }

        if (c === "\\") {
          escaped = true;
          continue;
        }

        if (c === '"') {
          const v: unknown = JSON.parse(source.slice(start, at));
          if (typeof v !== "string" || !unicodeSize(v)) error();
          return v as string;
        }
      }
      return error() as never;
    }

    function value(depth: number): Data {
      whitespace();
      if (++nodes > BOUNDS.nodes) error();
      const c = source[at];

      if (c === '"') return string();
      if (c === "{" || c === "[") {
        if (depth >= BOUNDS.depth) error();
        at++;

        whitespace();

        if (c === "[") {
          const arr: Data[] = [];

          if (source[at] === "]") {
            at++;
            return Object.freeze(arr);
          }

          while (true) {
            if (arr.length >= BOUNDS.array) error();
            arr.push(value(depth + 1));
            whitespace();
            const sep = source[at++];
            if (sep === "]") break;
            if (sep !== ",") error();
          }

          return Object.freeze(arr);
        }

        const obj: Record<string, Data> = {};
        const names = new Set<string>();

        if (source[at] === "}") {
          at++;
          return Object.freeze(obj);
        }

        while (true) {
          whitespace();
          if (source[at] !== '"') error();

          const key = string();

          if (names.has(key) || !validKey(key) || names.size >= BOUNDS.members)
            error();

          names.add(key);
          whitespace();

          if (source[at++] !== ":") error();
          obj[key] = value(depth + 1);
          whitespace();

          const sep = source[at++];
          if (sep === "}") break;
          if (sep !== ",") error();
        }

        return Object.freeze(obj);
      }

      for (const [literal, result] of [
        ["true", true],
        ["false", false],
        ["null", null],
      ] as const) {
        if (source.startsWith(literal, at)) {
          at += literal.length;
          return result;
        }
      }

      const number =
        /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(
          source.slice(at),
        );
      if (!number) return error() as never;
      at += number[0].length;
      const n = Number(number[0]);
      if (!Number.isSafeInteger(n) || Object.is(n, -0)) error();
      return n;
    }

    const result = value(0);
    whitespace();

    if (at !== source.length) error();
    return ok(result);
  } catch {
    return fail("invalid_format");
  }
}

export function encode(input: unknown, codec: Utf8Codec): Result<Uint8Array> {
  const safe = plainData(input);
  if (!safe.ok) return safe;

  try {
    const bytes = codec.encode(JSON.stringify(safe.value));
    return bytes.length <= BOUNDS.bytes ? ok(bytes) : fail("out_of_range");
  } catch {
    return fail("invalid_format");
  }
}
