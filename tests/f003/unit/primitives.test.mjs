import { test } from "node:test";
import assert from "node:assert/strict";
import {
  integerOp,
  gcd,
  MAX_INTEGER,
} from "../../../packages/domain/src/integers.ts";
import { decimalOp } from "../../../packages/domain/src/decimals.ts";
import {
  rationalOp,
  toDecimal,
  toRational,
} from "../../../packages/domain/src/rationals.ts";
import {
  moneyOp,
  moneyToDecimal,
  decimalToMoney,
} from "../../../packages/domain/src/money.ts";
import { secondsOp } from "../../../packages/domain/src/seconds.ts";
const d = (c, s = 0) => ({ coefficient: String(c), scale: s }),
  r = (n, den = 1) => ({ numerator: String(n), denominator: String(den) }),
  m = (n, exponent = 2) => ({
    minorUnits: String(n),
    currency: "XTS",
    exponent,
    profileVersion: "synthetic-v1",
  });
const cases = [
  ["0.1+0.2", () => decimalOp(d(1, 1), d(2, 1), "add"), d(3, 1)],
  [
    "exact large integer",
    () => integerOp("9007199254740993", "1", "add"),
    "9007199254740994",
  ],
  ["1/8 finite", () => toDecimal(r(1, 8)), d(125, 3)],
  ["decimal to ratio", () => toRational(d(125, 3)), r(1, 8)],
  ["ratios addition", () => rationalOp(r(1, 3), r(1, 6), "add"), r(1, 2)],
  ["ratio subtract", () => rationalOp(r(1, 2), r(1, 3), "subtract"), r(1, 6)],
  ["ratio multiply", () => rationalOp(r(2, 3), r(3, 4), "multiply"), r(1, 2)],
  ["ratio divide", () => rationalOp(r(2, 3), r(-4, 5), "divide"), r(-5, 6)],
  [
    "cross cancel before bound",
    () => rationalOp(r(MAX_INTEGER), r(1, MAX_INTEGER), "multiply"),
    r(1),
  ],
  ["decimal multiply", () => decimalOp(d(12, 1), d(3), "multiply"), d(36, 1)],
  ["decimal subtract", () => decimalOp(d(12, 1), d(2, 1), "subtract"), d(1)],
  ["decimal compare", () => decimalOp(d(12, 1), d(2), "compare"), -1],
  ["money decimal", () => moneyToDecimal(m(123)), d(123, 2)],
  ["money conversion", () => decimalToMoney(d(123, 2), m(0)), m(123)],
  ["money addition", () => moneyOp(m(1), m(2), "add"), m(3)],
  [
    "seconds conserved",
    () => secondsOp({ seconds: "59" }, { seconds: "61" }, "add"),
    { seconds: "120" },
  ],
];
for (const [label, run, value] of cases)
  test(`A-06–A-10 ${label}`, () =>
    assert.deepEqual(run(), { ok: true, value }));
for (const [label, run, issue] of [
  ["third nonterminating", () => toDecimal(r(1, 3)), "non_representable"],
  ["scale limit", () => toDecimal(r(1, 2n ** 19n)), "out_of_range"],
  ["division zero", () => rationalOp(r(1), r(0), "divide"), "division_by_zero"],
  [
    "integer overflow",
    () => integerOp(MAX_INTEGER.toString(), "1", "add"),
    "out_of_range",
  ],
  [
    "decimal output overflow",
    () => decimalOp(d(MAX_INTEGER), d(2), "multiply"),
    "out_of_range",
  ],
  [
    "money fractional minor unit",
    () => decimalToMoney(d(1234, 3), m(0)),
    "non_representable",
  ],
  [
    "unlike currency",
    () => moneyOp(m(1), { ...m(1), currency: "XXX" }, "add"),
    "incompatible_unit",
  ],
  [
    "different profile",
    () => moneyOp(m(1), { ...m(1), profileVersion: "synthetic-v2" }, "compare"),
    "incompatible_unit",
  ],
  [
    "ordinary negative result",
    () => moneyOp(m(1), m(2), "subtract"),
    "out_of_range",
  ],
  [
    "seconds overflow",
    () =>
      secondsOp({ seconds: "9223372036854775807" }, { seconds: "1" }, "add"),
    "out_of_range",
  ],
  [
    "seconds negative",
    () => secondsOp({ seconds: "0" }, { seconds: "1" }, "subtract"),
    "out_of_range",
  ],
  ["GCD budget", () => gcd(3n, 2n, { remaining: 0 }), "work_limit"],
])
  test(`A-08–A-09 ${label}`, () =>
    assert.deepEqual(run(), { ok: false, issue }));
test("independent bounded algebraic cases seed F003-17", () => {
  let seed = 17;
  for (let i = 0; i < 200; i++) {
    seed = (seed * 48271) % 2147483647;
    const a = seed % 1000;
    seed = (seed * 48271) % 2147483647;
    const b = seed % 1000;
    assert.deepEqual(decimalOp(d(a), d(b), "add"), {
      ok: true,
      value: d(a + b),
    });
    assert.equal(
      integerOp(String(a), String(b), "compare").value,
      Math.sign(a - b),
    );
  }
});
import { normalizeEntry } from "../fixtures/numeric-entry.mjs";
test("A-12 reviewed entry normalization and ambiguous input", () => {
  assert.deepEqual(normalizeEntry("١٢٣٫٤٥"), {
    status: "ready",
    value: d(12345, 2),
  });
  assert.deepEqual(normalizeEntry("١٢٣٫٤٥"), normalizeEntry("123.45"));
  assert.deepEqual(normalizeEntry("1,234"), {
    status: "needs_interpretation",
    original: "1,234",
  });
});
import { scratch } from "../../../packages/domain/src/integers.ts";
test("A-03 scratch digit and exact remainder-work boundaries", () => {
  assert.equal(scratch(BigInt("9".repeat(128))), true);
  assert.equal(scratch(BigInt("1".repeat(129))), false);
  assert.deepEqual(gcd(3n, 2n, { remaining: 2 }), { ok: true, value: 1n });
  assert.deepEqual(gcd(3n, 2n, { remaining: 1 }), {
    ok: false,
    issue: "work_limit",
  });
  assert.deepEqual(gcd(BigInt("1".repeat(129)), 1n), {
    ok: false,
    issue: "work_limit",
  });
});
