import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { allocate } from "../../../tooling/verification/artifacts.mjs";
import { childEnvironment } from "../../../tooling/verification/run-suite.mjs";
import {
  fixtures,
  rawMarkers,
} from "../../f006/fixtures/protection-fixtures.mjs";
import { inventoryFiles } from "../../../tooling/f006/file-inventory.mjs";

test("A-09..A-11 built-Electron A/B profile isolation, substitution rejection and restart", async ({
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
    F004_SYNTHETIC_PROFILES: "1",
    F004_PROFILE: "synthetic-a",
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

    const isolationResult = await app.evaluate(
      async (_, { userDir, fixtureA, fixtureB }) => {
        const req = globalThis.__F002_REQUIRE;
        const path = req("node:path");
        const fsPromises = req("node:fs/promises");
        const { ProtectionOwner, ElectronKeyProvider } = req(
          globalThis.__F002_BUILT_ENTRY,
        );

        const provider = new ElectronKeyProvider();
        const availability = provider.classifyAvailability();

        if (availability !== "available") {
          return {
            available: false,
            availability,
            failClosed: true,
          };
        }

        const known = (p, epoch) =>
          ["synthetic-a", "synthetic-b"].includes(p) && epoch === 1;

        const ownerA = new ProtectionOwner(
          { profileId: "synthetic-a", epoch: 1 },
          known,
          provider,
        );
        const ownerB = new ProtectionOwner(
          { profileId: "synthetic-b", epoch: 1 },
          known,
          provider,
        );

        const dirA = path.join(userDir, "ds-a");
        const dirB = path.join(userDir, "ds-b");

        // 1. A creates its dataset
        const dsA = await ownerA.createSyntheticDataSet(dirA, fixtureA.records);
        ownerA.lock();

        // 2. B cannot open A's dataset (A-09)
        let bDenied = false;
        try {
          await ownerB.openProtected(dirA);
        } catch {
          bDenied = true;
        }

        // 3. B creates its dataset
        const dsB = await ownerB.createSyntheticDataSet(dirB, fixtureB.records);
        ownerB.lock();

        // 4. Copied metadata/key substitution across profiles is denied (A-09)
        const genA = dsA.activeGeneration;
        const genB = dsB.activeGeneration;
        const keyEnvA = path.join(dirA, "generations", genA, "key.envelope");
        const keyEnvB = path.join(dirB, "generations", genB, "key.envelope");

        let substitutionDenied = false;
        try {
          await fsPromises.copyFile(keyEnvA, keyEnvB);
          await ownerB.openProtected(dirB);
        } catch {
          substitutionDenied = true;
        } finally {
          ownerB.lock();
        }

        // 5. Profile switch locks access (A-10)
        let lockedReadDenied = false;
        try {
          ownerA.allRecords();
        } catch {
          lockedReadDenied = true;
        }

        // 6. Legitimate reopen restores exact records (A-11)
        await ownerA.openProtected(dirA);
        const reopenedA = ownerA.allRecords();
        ownerA.lock();

        return {
          available: true,
          availability: "available",
          bDenied,
          substitutionDenied,
          lockedReadDenied,
          reopenedMatch:
            JSON.stringify(reopenedA) === JSON.stringify(fixtureA.records),
        };
      },
      {
        userDir: user,
        fixtureA: fixtures.a,
        fixtureB: fixtures.b,
      },
    );

    if (!isolationResult.available) {
      expect(isolationResult.failClosed).toBe(true);
      await testInfo.attach("f006-a09-a11-observation", {
        body: JSON.stringify(
          {
            target: `${process.platform}-${process.arch}`,
            scenarios: ["A-09", "A-10", "A-11"],
            availability: isolationResult.availability,
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

    expect(isolationResult.bDenied).toBe(true);
    expect(isolationResult.substitutionDenied).toBe(true);
    expect(isolationResult.lockedReadDenied).toBe(true);
    expect(isolationResult.reopenedMatch).toBe(true);

    // Verify zero raw markers anywhere on disk
    const files = await inventoryFiles(user, rawMarkers);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file.markerCount).toBe(0);
    }

    await testInfo.attach("f006-a09-a11-observation", {
      body: JSON.stringify(
        {
          target: `${process.platform}-${process.arch}`,
          scenarios: ["A-09", "A-10", "A-11"],
          outcome: "passed",
          filesInspected: files.length,
          rawMarkersFound: 0,
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
