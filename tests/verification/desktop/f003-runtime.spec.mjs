import { test, expect } from "@playwright/test";
import { buildFixtures } from "../../../tooling/f003/build.mjs";
import { probe } from "../../../tooling/f003/runtime-probe.mjs";
test("native target embedded Electron executes the shared F003 fixture pack", async () => {
  const built = await buildFixtures(),
    result = await probe("electron", built);
  expect(result.executed).toBe(53);
  expect(result.passed).toBe(result.executed);
  expect(result.failed).toBe(0);
  console.log(
    JSON.stringify({
      engine: result.engine,
      version: result.version,
      node: result.node,
      executed: result.executed,
      bundle_sha256: built.sha256,
    }),
  );
});
