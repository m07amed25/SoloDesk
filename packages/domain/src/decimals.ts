import { integer, ok, fail, record, scratch, type Result } from "./integers.ts";
export type Decimal = Readonly<{ coefficient: string; scale: number }>;
export function decimal(input: unknown, canonical = false): Result<Decimal> {
  if (!record(input, ["coefficient", "scale"])) return fail("invalid_type");
  const c = integer(input.coefficient);
  if (!c.ok) return c;
  if (
    typeof input.scale !== "number" ||
    !Number.isInteger(input.scale) ||
    input.scale < 0 ||
    input.scale > 18
  )
    return fail("out_of_range");
  let n = BigInt(c.value),
    scale = input.scale;
  if (n === 0n) scale = 0;
  while (scale > 0 && n % 10n === 0n) {
    n /= 10n;
    scale--;
  }
  if (canonical && (n.toString() !== c.value || scale !== input.scale))
    return fail("noncanonical");
  return ok(Object.freeze({ coefficient: n.toString(), scale }));
}
export function decimalOp(
  a: unknown,
  b: unknown,
  operation: "add" | "subtract" | "multiply" | "compare",
): Result<Decimal | number> {
  const x = decimal(a, true),
    y = decimal(b, true);
  if (!x.ok) return x;
  if (!y.ok) return y;
  let scale = Math.max(x.value.scale, y.value.scale);
  const l = BigInt(x.value.coefficient) * 10n ** BigInt(scale - x.value.scale),
    r = BigInt(y.value.coefficient) * 10n ** BigInt(scale - y.value.scale);
  if (operation === "compare") return ok(l < r ? -1 : l > r ? 1 : 0);
  let n: bigint;
  if (operation === "multiply") {
    n = BigInt(x.value.coefficient) * BigInt(y.value.coefficient);
    scale = x.value.scale + y.value.scale;
  } else if (operation === "add") n = l + r;
  else if (operation === "subtract") n = l - r;
  else return fail("invalid_format");
  if (!scratch(n)) return fail("work_limit");
  if (n === 0n) scale = 0;
  while (scale > 0 && n % 10n === 0n) {
    n /= 10n;
    scale--;
  }
  return decimal({ coefficient: n.toString(), scale });
}
