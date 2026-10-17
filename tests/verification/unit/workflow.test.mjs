import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("workflow exists with unfiltered events and explicit fail-closed aggregate", () => {
  const s = fs.readFileSync(".github/workflows/verify.yml", "utf8");
  assert.match(s, /pull_request:/);
  assert.match(s, /F002 \/ automated-readiness/);
  assert.match(s, /always\(\)/);
  assert.match(s, /needs: \[context, baseline, security, desktop\]/);
  assert.doesNotMatch(
    s,
    /paths-ignore:|continue-on-error:\s*true|pull_request_target:/,
  );
});
