import {
  integer,
  gcd,
  ok,
  fail,
  record,
  scratch,
  type Result,
} from "./integers.ts";
import { decimal, type Decimal } from "./decimals.ts";

export type Rational = Readonly<{ numerator: string; denominator: string }>;

export function rational(input: unknown, canonical = false): Result<Rational> {
  if (!record(input, ["numerator", "denominator"])) return fail("invalid_type");

  const n = integer(input.numerator),
    d = integer(input.denominator, true);

  if (!n.ok) return n;
  if (!d.ok) return d;
  if (d.value === "0") return fail("division_by_zero");

  const a = BigInt(n.value),
    b = BigInt(d.value),
    g = gcd(a, b);

  if (!g.ok) return g;

  const value = Object.freeze({
    numerator: (a / g.value).toString(),
    denominator: (b / g.value).toString(),
  });

  if (
    canonical &&
    (value.numerator !== n.value || value.denominator !== d.value)
  )
    return fail("noncanonical");

  return ok(value);
}

export function rationalOp(
  a: unknown,
  b: unknown,
  operation: "add" | "subtract" | "multiply" | "divide" | "compare",
): Result<Rational | number> {
  const x = rational(a, true),
    y = rational(b, true);

  if (!x.ok) return x;
  if (!y.ok) return y;

  const an = BigInt(x.value.numerator),
    ad = BigInt(x.value.denominator),
    bn = BigInt(y.value.numerator),
    bd = BigInt(y.value.denominator);

  if (operation === "compare")
    return ok(an * bd < bn * ad ? -1 : an * bd > bn * ad ? 1 : 0);

  let n: bigint, d: bigint;
  const budget = { remaining: 1024 };

  if (operation === "multiply" || operation === "divide") {
    if (operation === "divide" && bn === 0n) return fail("division_by_zero");

    const rn = operation === "divide" ? bd : bn,
      rd = operation === "divide" ? bn : bd;

    const g1 = gcd(an, rd, budget),
      g2 = gcd(rn, ad, budget);

    if (!g1.ok) return g1;
    if (!g2.ok) return g2;

    n = (an / g1.value) * (rn / g2.value);
    d = (ad / g2.value) * (rd / g1.value);
  } else if (operation === "add" || operation === "subtract") {
    n = an * bd + (operation === "add" ? 1n : -1n) * bn * ad;
    d = ad * bd;
  } else return fail("invalid_format");

  if (!scratch(n) || !scratch(d)) return fail("work_limit");
  if (d < 0n) {
    n = -n;
    d = -d;
  }

  const g = gcd(n, d, budget);
  if (!g.ok) return g;

  return rational({
    numerator: (n / g.value).toString(),
    denominator: (d / g.value).toString(),
  });
}

export function toRational(input: unknown): Result<Rational> {
  const v = decimal(input, true);
  if (!v.ok) return v;
  return rational({
    numerator: v.value.coefficient,
    denominator: (10n ** BigInt(v.value.scale)).toString(),
  });
}

export function toDecimal(input: unknown): Result<Decimal> {
  const v = rational(input, true);
  if (!v.ok) return v;

  let d = BigInt(v.value.denominator),
    two = 0,
    five = 0;

  while (d % 2n === 0n) {
    d /= 2n;
    two++;
  }

  while (d % 5n === 0n) {
    d /= 5n;
    five++;
  }

  if (d !== 1n) return fail("non_representable");
  const scale = Math.max(two, five);
  if (scale > 18) return fail("out_of_range");

  const n =
    BigInt(v.value.numerator) *
    2n ** BigInt(scale - two) *
    5n ** BigInt(scale - five);
  return decimal({ coefficient: n.toString(), scale });
}
