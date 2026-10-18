export type Issue =
  | "invalid_type"
  | "invalid_format"
  | "noncanonical"
  | "out_of_range"
  | "division_by_zero"
  | "incompatible_unit"
  | "non_representable"
  | "work_limit";
export type Result<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; issue: Issue }>;
export const ok = <T>(value: T): Result<T> =>
  Object.freeze({ ok: true, value });
export const fail = (issue: Issue): Result<never> =>
  Object.freeze({ ok: false, issue });
export const MAX_INTEGER = 10n ** 38n - 1n;
export const MAX_COUNTER = 9223372036854775807n;
export const abs = (v: bigint): bigint => (v < 0n ? -v : v);
export function integer(
  value: unknown,
  nonnegative = false,
  maximum = MAX_INTEGER,
): Result<string> {
  if (typeof value !== "string") return fail("invalid_type");
  if (value.length > 39 || value.replace("-", "").length > 38)
    return fail("out_of_range");
  if (!/^(0|-?[1-9][0-9]*)$/.test(value)) return fail("invalid_format");
  const n = BigInt(value);
  if (abs(n) > MAX_INTEGER || abs(n) > maximum || (nonnegative && n < 0n))
    return fail("out_of_range");
  return ok(value);
}
export const revision = (value: unknown): Result<string> =>
  integer(value, true, MAX_COUNTER);
export const scratch = (value: bigint): boolean =>
  abs(value).toString().length <= 128;
export function gcd(
  a: bigint,
  b: bigint,
  budget = { remaining: 1024 },
): Result<bigint> {
  if (!scratch(a) || !scratch(b)) return fail("work_limit");
  a = abs(a);
  b = abs(b);
  while (b !== 0n) {
    if (--budget.remaining < 0) return fail("work_limit");
    [a, b] = [b, a % b];
  }
  return ok(a);
}
export function record(
  value: unknown,
  keys: readonly string[],
  required: readonly string[] = keys,
): value is Record<string, unknown> {
  try {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      return false;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    return (
      Reflect.ownKeys(value).every(
        (k) =>
          typeof k === "string" &&
          keys.includes(k) &&
          "value" in descriptors[k] &&
          descriptors[k].enumerable,
      ) && required.every((k) => Object.hasOwn(value, k))
    );
  } catch {
    return false;
  }
}
export function integerOp(
  a: unknown,
  b: unknown,
  operation: "add" | "subtract" | "compare",
): Result<string | number> {
  const x = integer(a),
    y = integer(b);
  if (!x.ok) return x;
  if (!y.ok) return y;
  const l = BigInt(x.value),
    r = BigInt(y.value);
  if (operation === "compare") return ok(l < r ? -1 : l > r ? 1 : 0);
  if (operation !== "add" && operation !== "subtract")
    return fail("invalid_format");
  return integer((operation === "add" ? l + r : l - r).toString());
}
