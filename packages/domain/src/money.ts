import { integer, ok, fail, record, type Result } from "./integers.ts";
import { decimal, type Decimal } from "./decimals.ts";

export type Money = Readonly<{
  minorUnits: string;
  currency: string;
  exponent: number;
  profileVersion: string;
  adjustment?: true;
}>;

export function money(input: unknown): Result<Money> {
  if (
    !record(
      input,
      ["minorUnits", "currency", "exponent", "profileVersion", "adjustment"],
      ["minorUnits", "currency", "exponent", "profileVersion"],
    )
  )
    return fail("invalid_type");

  if (Object.hasOwn(input, "adjustment") && input.adjustment !== true)
    return fail("invalid_type");

  const n = integer(input.minorUnits, input.adjustment !== true);

  if (!n.ok) return n;

  if (typeof input.currency !== "string" || !/^[A-Z]{3}$/.test(input.currency))
    return fail("invalid_format");

  if (
    typeof input.exponent !== "number" ||
    !Number.isInteger(input.exponent) ||
    input.exponent < 0 ||
    input.exponent > 9
  )
    return fail("out_of_range");

  if (
    typeof input.profileVersion !== "string" ||
    !/^[a-z][a-z0-9-]{0,63}$/.test(input.profileVersion)
  )
    return fail("invalid_format");

  return ok(
    Object.freeze({
      minorUnits: n.value,
      currency: input.currency,
      exponent: input.exponent,
      profileVersion: input.profileVersion,
      ...(input.adjustment === true ? { adjustment: true as const } : {}),
    }),
  );
}

export function moneyOp(
  a: unknown,
  b: unknown,
  operation: "add" | "subtract" | "compare",
): Result<Money | number> {
  const x = money(a),
    y = money(b);

  if (!x.ok) return x;
  if (!y.ok) return y;

  const l = x.value,
    r = y.value;

  if (
    l.currency !== r.currency ||
    l.exponent !== r.exponent ||
    l.profileVersion !== r.profileVersion ||
    l.adjustment !== r.adjustment
  )
    return fail("incompatible_unit");

  const an = BigInt(l.minorUnits),
    bn = BigInt(r.minorUnits);

  if (operation === "compare") return ok(an < bn ? -1 : an > bn ? 1 : 0);
  if (operation !== "add" && operation !== "subtract")
    return fail("invalid_format");

  return money({
    ...l,
    minorUnits: (operation === "add" ? an + bn : an - bn).toString(),
  });
}

export function moneyToDecimal(input: unknown): Result<Decimal> {
  const v = money(input);
  return v.ok
    ? decimal({ coefficient: v.value.minorUnits, scale: v.value.exponent })
    : v;
}

export function decimalToMoney(
  input: unknown,
  profile: unknown,
): Result<Money> {
  const v = decimal(input, true),
    p = money(profile);

  if (!v.ok) return v;
  if (!p.ok) return p;

  const n = BigInt(v.value.coefficient),
    delta = p.value.exponent - v.value.scale;

  if (delta < 0 && n % 10n ** BigInt(-delta) !== 0n)
    return fail("non_representable");

  return money({
    ...p.value,
    minorUnits: (delta >= 0
      ? n * 10n ** BigInt(delta)
      : n / 10n ** BigInt(-delta)
    ).toString(),
  });
}
