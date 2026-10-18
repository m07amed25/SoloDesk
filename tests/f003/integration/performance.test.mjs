import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { decode } from "../../../packages/contracts/src/codec.ts";
import { gcd, MAX_INTEGER } from "../../../packages/domain/src/integers.ts";
import { rationalOp } from "../../../packages/domain/src/rationals.ts";
import { utf8 } from "../fixtures/context.mjs";
test("200 maximum-byte decodes and 1000 bounded exact primitive operations meet proposed budgets", () => {
  const payload = '{"a":0}',
    bytes = utf8.encode(payload + " ".repeat(262144 - payload.length)),
    decodes = [],
    operations = [];
  for (let i = 0; i < 200; i++) {
    const start = performance.now(),
      result = decode(bytes, utf8);
    decodes.push(performance.now() - start);
    assert.deepEqual(result, { ok: true, value: { a: 0 } });
  }
  let a = 1n,
    b = 1n;
  while (a + b <= MAX_INTEGER) [a, b] = [b, a + b];
  const budget = { remaining: 1024 };
  assert.equal(gcd(b, a, budget).value, 1n);
  const operand = { numerator: b.toString(), denominator: a.toString() };
  for (let i = 0; i < 1000; i++) {
    const start = performance.now(),
      result = rationalOp(operand, operand, "subtract");
    operations.push(performance.now() - start);
    assert.deepEqual(result, {
      ok: true,
      value: { numerator: "0", denominator: "1" },
    });
  }
  const p95 = (a) => a.sort((x, y) => x - y)[Math.ceil(a.length * 0.95) - 1];
  const measured = {
    cpu: os.cpus()[0]?.model,
    os: os.release(),
    arch: process.arch,
    node: process.versions.node,
    envelope_bytes: bytes.length,
    decode_count: 200,
    primitive_count: 1000,
    integer_digits: 38,
    gcd_observed_steps: 1024 - budget.remaining,
    operand,
    scratch_digits_max: 128,
    gcd_steps_max: 1024,
    power_mode: "unobserved",
    decode_p95_ms: p95(decodes),
    primitive_p95_ms: p95(operations),
  };
  console.log(JSON.stringify(measured));
  assert.ok(measured.decode_p95_ms <= 50);
  assert.ok(measured.primitive_p95_ms <= 5);
});
