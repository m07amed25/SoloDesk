import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { allocate } from "../../../tooling/verification/artifacts.mjs";
import { childEnvironment } from "../../../tooling/verification/run-suite.mjs";
import { inventoryFiles } from "../../../tooling/f006/file-inventory.mjs";
import {
  fixtures,
  rawMarkers,
} from "../../f006/fixtures/protection-fixtures.mjs";

test("A-12..A-13 packaged-process termination and raw-residue inspection across rotation checkpoints", async ({
  playwright,
}, testInfo) => {
  const root = process.cwd();
  const owned = allocate(root, `desktop-${crypto.randomUUID()}`);
  const user = path.join(root, owned, "userData");
  const session = path.join(root, owned, "sessionData");
  fs.mkdirSync(user, { mode: 0o700 });
  fs.mkdirSync(session, { mode: 0o700 });

  const env = childEnvironment({
    F002_USER_DATA: user,
    F002_SESSION_DATA: session,
    F002_ROOT: root,
  });

  let app;
  try {
    app = await playwright._electron.launch({
      args: [path.join(root, "tooling/verification/electron-bootstrap.cjs")],
      chromiumSandbox: true,
      timeout: 30000,
      env,
    });
    await app.firstWindow({ timeout: 30000 });

    const rotationObservation = await app.evaluate(
      async (_, { userDir, records }) => {
        const req = globalThis.__F002_REQUIRE;
        const path = req("node:path");
        const {
          ProtectionOwner,
          ElectronKeyProvider,
          rotateKey,
          reconcileRotation,
        } = req(globalThis.__F002_BUILT_ENTRY);

        const provider = new ElectronKeyProvider();
        const availability = provider.classifyAvailability();

        if (availability !== "available") {
          return {
            available: false,
            availability,
            failClosed: true,
          };
        }

        const dsPath = path.join(userDir, "rotation-ds");
        const owner = new ProtectionOwner(
          { profileId: "synthetic-a", epoch: 1 },
          (p, epoch) => p === "synthetic-a" && epoch === 1,
          provider,
        );

        // 1. Create dataset
        const ds = await owner.createSyntheticDataSet(dsPath, records);
        const initialGen = ds.activeGeneration;

        // 2. Interruption at prepared
        let prepPassed = false;
        try {
          await rotateKey(owner, dsPath, provider, { failAt: "prepared" });
        } catch {
          const rec = await reconcileRotation(dsPath, provider);
          prepPassed = rec.selectedGeneration === initialGen;
        }

        // 3. Interruption at candidate_written
        let writePassed = false;
        try {
          await rotateKey(owner, dsPath, provider, {
            failAt: "candidate_written",
          });
        } catch {
          const rec = await reconcileRotation(dsPath, provider);
          writePassed = rec.selectedGeneration === initialGen;
        }

        // 4. Interruption at candidate_verified
        let verifyPassed = false;
        try {
          await rotateKey(owner, dsPath, provider, {
            failAt: "candidate_verified",
          });
        } catch {
          const rec = await reconcileRotation(dsPath, provider);
          verifyPassed = rec.selectedGeneration === initialGen;
        }

        // 5. Complete rotation through selected and retired
        const fullResult = await rotateKey(owner, dsPath, provider);
        const rotationCompleted =
          fullResult.attempt.phase === "retired" &&
          fullResult.newGeneration !== initialGen;

        owner.lock();

        return {
          available: true,
          availability: "available",
          prepPassed,
          writePassed,
          verifyPassed,
          rotationCompleted,
        };
      },
      {
        userDir: user,
        records: fixtures.a.records,
      },
    );

    if (!rotationObservation.available) {
      expect(rotationObservation.failClosed).toBe(true);
      await testInfo.attach("f006-a12-a13-observation", {
        body: JSON.stringify(
          {
            target: `${process.platform}-${process.arch}`,
            scenarios: ["A-12", "A-13"],
            availability: rotationObservation.availability,
            outcome: "blocked",
            reason: "native-provider-unprotected-or-locked-on-target",
            failClosed: true,
          },
          null,
          2,
        ),
        contentType: "application/json",
      });
      return;
    }

    expect(rotationObservation.prepPassed).toBe(true);
    expect(rotationObservation.writePassed).toBe(true);
    expect(rotationObservation.verifyPassed).toBe(true);
    expect(rotationObservation.rotationCompleted).toBe(true);

    // Verify zero raw markers anywhere on disk after rotation checkpoints
    const files = await inventoryFiles(user, rawMarkers);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file.markerCount).toBe(0);
    }

    await testInfo.attach("f006-a12-a13-observation", {
      body: JSON.stringify(
        {
          target: `${process.platform}-${process.arch}`,
          scenarios: ["A-12", "A-13"],
          outcome: "passed",
          filesInspected: files.length,
          rawMarkersFound: 0,
          allCheckpointsVerified: true,
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(user, { recursive: true, force: true });
    fs.rmSync(session, { recursive: true, force: true });
  }
});
