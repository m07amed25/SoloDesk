import { id } from "../../../packages/domain/src/ids.ts";
import { plainData } from "../../../packages/contracts/src/validation.ts";
import { decode, encode } from "../../../packages/contracts/src/codec.ts";
import type { Utf8Codec } from "../../../packages/contracts/src/ports.ts";
import { request } from "../../../packages/contracts/src/envelopes.ts";
import { Registry } from "../../../packages/contracts/src/registry.ts";
import { publicError } from "../../../packages/contracts/src/errors.ts";
import { acceptedEvent } from "../../../packages/contracts/src/versions.ts";
import { integer, integerOp } from "../../../packages/domain/src/integers.ts";
import { decimalOp } from "../../../packages/domain/src/decimals.ts";
import { toDecimal } from "../../../packages/domain/src/rationals.ts";
import { moneyToDecimal } from "../../../packages/domain/src/money.ts";
import { secondsOp } from "../../../packages/domain/src/seconds.ts";
import { calendarDate, instant } from "../../../packages/domain/src/dates.ts";
import { canonical } from "../../../packages/contracts/src/intent.ts";
import { CODES, ISSUE_KEYS } from "../../../packages/contracts/src/errors.ts";
import { en } from "../../../packages/localization/src/en.ts";
import { ar } from "../../../packages/localization/src/ar.ts";
export function runFixtures(codec: Utf8Codec) {
  const uuid = "11111111-1111-4111-8111-111111111111";
  const registry = new Registry([
    {
      owner: "F003",
      name: "conformance.echo",
      kind: "query",
      versions: [1],
      device: false,
      revision: "absent",
      occurrence: false,
      payload: plainData,
    },
  ]);
  const req = {
    protocolVersion: 1,
    payloadVersion: 1,
    boundsProfile: "F003-bounds-v1",
    kind: "query",
    operation: "conformance.echo",
    requestId: { kind: "request", value: uuid },
    workspaceId: { kind: "workspace", value: uuid },
    payload: { text: "مرحبا" },
  };
  const encoded = encode(req.payload, codec);

  const cases: Readonly<{ id: string; actual: unknown; expected: unknown }>[] =
    [
      {
        id: "exact-large",
        actual: integerOp("9007199254740993", "1", "add"),
        expected: { ok: true, value: "9007199254740994" },
      },
      {
        id: "decimal-sum",
        actual: decimalOp(
          { coefficient: "1", scale: 1 },
          { coefficient: "2", scale: 1 },
          "add",
        ),
        expected: { ok: true, value: { coefficient: "3", scale: 1 } },
      },
      {
        id: "third",
        actual: toDecimal({ numerator: "1", denominator: "3" }),
        expected: { ok: false, issue: "non_representable" },
      },
      {
        id: "eighth",
        actual: toDecimal({ numerator: "1", denominator: "8" }),
        expected: { ok: true, value: { coefficient: "125", scale: 3 } },
      },
      {
        id: "source-seconds",
        actual: secondsOp({ seconds: "59" }, { seconds: "61" }, "add"),
        expected: { ok: true, value: { seconds: "120" } },
      },
      {
        id: "leap-valid",
        actual: calendarDate("2028-02-29"),
        expected: { ok: true, value: "2028-02-29" },
      },
      {
        id: "leap-invalid",
        actual: calendarDate("2027-02-29"),
        expected: { ok: false, issue: "out_of_range" },
      },
      {
        id: "instant-precision",
        actual: instant("2026-10-18T01:02:03.0001Z"),
        expected: { ok: false, issue: "invalid_format" },
      },
      {
        id: "float-denial",
        actual: integer(1.2),
        expected: { ok: false, issue: "invalid_type" },
      },
      {
        id: "canonical-Arabic",
        actual: canonical({ b: "أ", a: ["x", 1] }),
        expected: { ok: true, value: '{"a":["x",1],"b":"أ"}' },
      },
      {
        id: "tag-substitution",
        actual: id({ kind: "project", value: uuid }, "workspace").ok,
        expected: false,
      },
      {
        id: "plain-data",
        actual: plainData({ a: ["مرحبا", "9007199254740993"] }),
        expected: { ok: true, value: { a: ["مرحبا", "9007199254740993"] } },
      },
      {
        id: "duplicate-key",
        actual: decode(codec.encode('{"a":1,"\\u0061":2}'), codec).ok,
        expected: false,
      },
      {
        id: "utf8-roundtrip",
        actual: encoded.ok ? decode(encoded.value, codec) : encoded,
        expected: { ok: true, value: { text: "مرحبا" } },
      },
      {
        id: "invalid-utf8",
        actual: decode(new Uint8Array([192, 175]), codec).ok,
        expected: false,
      },
      {
        id: "valid-request",
        actual: request(req, registry).ok,
        expected: true,
      },
      {
        id: "forged-actor",
        actual: request(
          { ...req, actorId: { kind: "actor", value: uuid } },
          registry,
        ).ok,
        expected: false,
      },
      {
        id: "unknown-request-version",
        actual: request({ ...req, protocolVersion: 2 }, registry).ok,
        expected: false,
      },
      {
        id: "raw-exception",
        actual: publicError({ message: "PRIVATE", stack: "PRIVATE" }).ok,
        expected: false,
      },
      {
        id: "unknown-event",
        actual: acceptedEvent({ protocolVersion: 2 }, ["conformance.recorded"])
          .ok,
        expected: false,
      },
      ...[0, 2, 3].map((exponent) => ({
        id: `precision-${exponent}`,
        actual: moneyToDecimal({
          minorUnits: "123",
          currency: "XTS",
          exponent,
          profileVersion: "synthetic-v1",
        }),
        expected: { ok: true, value: { coefficient: "123", scale: exponent } },
      })),
      ...[
        ...CODES.map((c) => `error.${c.toLowerCase()}`),
        ...ISSUE_KEYS.map((k) => `issue.${k}`),
      ].map((key) => ({
        id: key,
        actual: Boolean(en[key]?.trim() && ar[key]?.trim()),
        expected: true,
      })),
    ];
  const observations = cases.map((v) => ({
    id: v.id,
    passed: JSON.stringify(v.actual) === JSON.stringify(v.expected),
    value: v.actual,
  }));
  return {
    pack: "F003-runtime-v1",
    executed: observations.length,
    passed: observations.filter((x) => x.passed).length,
    failed: observations.filter((x) => !x.passed).length,
    observations,
  };
}
