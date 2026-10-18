import { revision, ok, fail, record, type Result } from "./integers.ts";
export type Seconds = Readonly<{ seconds: string }>;
export function seconds(input: unknown): Result<Seconds> {
  if (!record(input, ["seconds"])) return fail("invalid_type");
  const n = revision(input.seconds);
  return n.ok ? ok(Object.freeze({ seconds: n.value })) : n;
}
export function secondsOp(
  a: unknown,
  b: unknown,
  operation: "add" | "subtract" | "compare",
): Result<Seconds | number> {
  const x = seconds(a),
    y = seconds(b);
  if (!x.ok) return x;
  if (!y.ok) return y;
  const l = BigInt(x.value.seconds),
    r = BigInt(y.value.seconds);
  if (operation === "compare") return ok(l < r ? -1 : l > r ? 1 : 0);
  if (operation !== "add" && operation !== "subtract")
    return fail("invalid_format");
  return seconds({ seconds: (operation === "add" ? l + r : l - r).toString() });
}
