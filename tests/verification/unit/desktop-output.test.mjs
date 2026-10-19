import { test } from "node:test";
import assert from "node:assert/strict";
import {
  desktopColorEnabled,
  formatDesktopHuman,
} from "../../../tooling/verification/desktop-output.mjs";

const escape = String.fromCharCode(27);
const stripColor = (value) =>
  value
    .split(escape)
    .map((part, index) => (index ? part.slice(part.indexOf("m") + 1) : part))
    .join("");

const result = {
  status: "passed",
  target: "linux-x64",
  electron: "44.8.0",
  counts: { executed: 2, passed: 2, failed: 0, skipped: 0 },
  stderr: "pw:browser noisy debug log",
};
const report = {
  stats: { duration: 2200 },
  suites: [
    {
      file: "f004-one.spec.mjs",
      specs: [
        {
          file: "f004-one.spec.mjs",
          line: 3,
          title: "first desktop check",
          tests: [{ status: "expected", results: [{ duration: 500 }] }],
        },
      ],
    },
    {
      file: "f007-two.spec.mjs",
      specs: [
        {
          file: "f007-two.spec.mjs",
          line: 7,
          title: "second desktop check",
          tests: [{ status: "expected", results: [{ duration: 700 }] }],
        },
      ],
    },
  ],
};

test("human desktop output names each passed case without nested browser logs", () => {
  const text = formatDesktopHuman(result, report, ".verification/report/result.json");
  assert.match(text, /F004  1 test\n  PASS  first desktop check · 0\.5s/);
  assert.match(text, /F007  1 test\n  PASS  second desktop check · 0\.7s/);
  assert.match(text, /PASSED  2 passed · 0 failed · 0 skipped · 2\.2s/);
  assert.match(text, /Report  \.verification\/report\/result\.json/);
  assert.doesNotMatch(text, /pw:browser/);
  assert.ok(!text.includes(escape));
});

test("failed cases show their error and a debug rerun command", () => {
  const failed = structuredClone(report);
  failed.suites[1].specs[0].tests[0] = {
    status: "unexpected",
    results: [{ status: "failed", errors: [{ message: "Expected recovery dialog" }] }],
  };
  const text = formatDesktopHuman(
    {
      ...result,
      status: "failed",
      counts: { executed: 2, passed: 1, failed: 1, skipped: 0 },
    },
    failed,
    ".verification/report/result.json",
  );
  assert.match(text, /FAIL  second desktop check/);
  assert.match(text, /f007-two\.spec\.mjs:7/);
  assert.match(text, /Expected recovery dialog/);
  assert.match(text, /FAILED  1 passed · 1 failed · 0 skipped/);
  assert.match(text, /SOLODESK_DESKTOP_DEBUG=1 npm run test:desktop/);
  assert.ok(
    formatDesktopHuman(
      { ...result, status: "failed", counts: { executed: 2, passed: 1, failed: 1, skipped: 0 } },
      failed,
      ".verification/report/result.json",
      { color: true },
    ).includes(`${escape}[1;31mFAIL${escape}[0m`),
  );
});

test("missing Playwright report states failure and retains bounded process diagnostics", () => {
  const text = formatDesktopHuman(
    {
      ...result,
      status: "failed",
      code: "native-incomplete",
      counts: null,
      stderr: "Cannot launch Electron",
    },
    null,
    ".verification/report/result.json",
  );
  assert.match(text, /FAILED  0 passed · 0 failed · 0 skipped/);
  assert.match(text, /Reason  native-incomplete/);
  assert.match(text, /Process output:\nCannot launch Electron/);
});

test("opt-in debug prints captured browser logs after the summary", () => {
  const text = formatDesktopHuman(
    result,
    report,
    ".verification/report/result.json",
    { debug: true },
  );
  assert.match(text, /Browser debug log:\npw:browser noisy debug log/);
});

test("terminal colors distinguish outcomes while plain text keeps the same labels", () => {
  const colored = formatDesktopHuman(
    result,
    report,
    ".verification/report/result.json",
    { color: true },
  );
  assert.ok(colored.includes(`${escape}[1;32mPASS${escape}[0m`));
  assert.ok(colored.includes(`${escape}[1;34mF004  1 test${escape}[0m`));
  assert.ok(colored.includes(`${escape}[1;32mPASSED${escape}[0m`));
  const plain = formatDesktopHuman(result, report, ".verification/report/result.json");
  assert.equal(stripColor(colored), plain);
});

test("NO_COLOR and dumb terminals disable color unless explicitly forced", () => {
  assert.equal(desktopColorEnabled({}, true), true);
  assert.equal(desktopColorEnabled({}, false), false);
  assert.equal(desktopColorEnabled({ NO_COLOR: "" }, true), false);
  assert.equal(desktopColorEnabled({ TERM: "dumb" }, true), false);
  assert.equal(desktopColorEnabled({ FORCE_COLOR: "1" }, false), true);
  assert.equal(desktopColorEnabled({ NO_COLOR: "1", FORCE_COLOR: "1" }, false), true);
  assert.equal(desktopColorEnabled({ FORCE_COLOR: "0" }, false), false);
});
