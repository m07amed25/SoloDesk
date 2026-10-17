import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { context, report } from "../fixtures/records.mjs";
import {
  allocate,
  writeRecord,
} from "../../../tooling/verification/artifacts.mjs";
const cli = path.resolve("tooling/verification/cli.mjs");
test("real CLI rejects missing whole producer and valid complete set passes", (t) => {
  const scratch = allocate(process.cwd(), `cli-${crypto.randomUUID()}`);
  t.after(() => fs.rmSync(scratch, { force: true, recursive: true }));
  const c = context(),
    selection = {
      schema: "solodesk.verification.selection",
      schema_version: 1,
      id: "selection-synthetic",
      context_ref: c.id,
      policy_ref: "policy-synthetic",
      authority: "bootstrap-candidate",
      checks: [
        {
          check_id: "typecheck",
          group: "baseline",
          selected: true,
          reason: "mandatory",
        },
      ],
      review_required: false,
      findings: [],
    };
  writeRecord(process.cwd(), `${scratch}/context.json`, c);
  writeRecord(process.cwd(), `${scratch}/selection.json`, selection);
  fs.mkdirSync(`${scratch}/reports`);
  const args = [
    cli,
    "aggregate",
    "--context",
    `${scratch}/context.json`,
    "--selection",
    `${scratch}/selection.json`,
    "--reports",
    `${scratch}/reports`,
  ];
  assert.equal(spawnSync(process.execPath, args).status, 1);
  writeRecord(process.cwd(), `${scratch}/reports/result.json`, report());
  const value = JSON.parse(
    execFileSync(process.execPath, args, { encoding: "utf8" }),
  );
  assert.equal(value.automated_ready, true);
  assert.equal(value.human_stages.owner, "pending");
});
test("CLI text and JSON agree on stale context failure", (t) => {
  const scratch = allocate(process.cwd(), `cli-${crypto.randomUUID()}`);
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const c = context(),
    s = {
      schema: "solodesk.verification.selection",
      schema_version: 1,
      id: "s",
      context_ref: "wrong",
      policy_ref: "p",
      authority: "bootstrap-candidate",
      checks: [{ check_id: "typecheck", selected: true, group: "baseline" }],
      review_required: false,
      findings: [],
    };
  writeRecord(process.cwd(), `${scratch}/c.json`, c);
  writeRecord(process.cwd(), `${scratch}/s.json`, s);
  fs.mkdirSync(`${scratch}/reports`);
  writeRecord(process.cwd(), `${scratch}/reports/r.json`, report());
  const args = [
    cli,
    "aggregate",
    "--context",
    `${scratch}/c.json`,
    "--selection",
    `${scratch}/s.json`,
    "--reports",
    `${scratch}/reports`,
  ];
  for (const format of ["text", "json"]) {
    const r = spawnSync(process.execPath, [...args, "--format", format], {
      encoding: "utf8",
    });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /selection-context-stale/);
  }
});
