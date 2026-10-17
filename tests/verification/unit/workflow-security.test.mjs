import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { workflowFindings } from "../../../tooling/verification/security.mjs";
test("actual workflow pins actions, does not persist credentials or grant producer writes", () => {
  const text = fs.readFileSync(".github/workflows/verify.yml", "utf8");
  assert.deepEqual(workflowFindings(text), []);
  assert.equal(
    (text.match(/uses: actions\/checkout@/g) || []).length,
    (text.match(/persist-credentials: false/g) || []).length,
  );
  assert.equal((text.match(/GITHUB_TOKEN:/g) || []).length, 1);
  assert.match(text, /aggregate:[\s\S]*GITHUB_TOKEN:/);
});
