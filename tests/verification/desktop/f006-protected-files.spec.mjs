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

test("A-01..A-04 built-Electron normal round-trip and raw-file inventory", async ({
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

  const fixture = fixtures.a;
  let app;

  try {
    app = await playwright._electron.launch({
      args: [path.join(root, "tooling/verification/electron-bootstrap.cjs")],
      chromiumSandbox: true,
      timeout: 30000,
      env,
    });
    await app.firstWindow({ timeout: 30000 });

    const targetObservation = await app.evaluate(
      async (_, { userDir, records, searchTerm, fileBytesHex }) => {
        const req = globalThis.__F002_REQUIRE;
        const path = req("node:path");
        const { ProtectionOwner, ElectronKeyProvider } = req(
          globalThis.__F002_BUILT_ENTRY,
        );

        const provider = new ElectronKeyProvider();
        const availability = provider.classifyAvailability();

        if (availability !== "available") {
          let failClosed = false;
          try {
            provider.assertAvailable();
          } catch {
            failClosed = true;
          }
          return {
            available: false,
            availability,
            failClosed,
          };
        }

        const dsPath = path.join(userDir, "protected-dataset");
        const owner = new ProtectionOwner(
          { profileId: "synthetic-a", epoch: 1 },
          (p, epoch) => p === "synthetic-a" && epoch === 1,
          provider,
        );

        const dataSet = await owner.createSyntheticDataSet(dsPath, records);
        const searchHits = owner.search(searchTerm);
        const staged = await owner.stageSyntheticFile(
          Buffer.from(fileBytesHex, "hex"),
        );
        const readBack = await owner.readSyntheticFile(staged);
        owner.lock();

        return {
          available: true,
          availability: "available",
          dataSetId: dataSet.dataSetId,
          searchHits,
          staged,
          readBackHex: readBack.toString("hex"),
        };
      },
      {
        userDir: user,
        records: fixture.records,
        searchTerm: fixture.searchTerm,
        fileBytesHex: fixture.fileBytes.toString("hex"),
      },
    );

    if (!targetObservation.available) {
      expect(targetObservation.failClosed).toBe(true);
      await testInfo.attach("f006-a01-a04-observation", {
        body: JSON.stringify(
          {
            target: `${process.platform}-${process.arch}`,
            scenarios: ["A-01", "A-02", "A-03", "A-04"],
            availability: targetObservation.availability,
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

    expect(targetObservation.searchHits).toContain("A6-AR-شُعاع-النيل-٧٣");
    expect(targetObservation.readBackHex).toBe(
      fixture.fileBytes.toString("hex"),
    );

    // Inspect raw file inventory after lock
    const preRestartInventory = await inventoryFiles(user, rawMarkers);
    expect(preRestartInventory.length).toBeGreaterThan(0);
    for (const file of preRestartInventory) {
      expect(file.markerCount).toBe(0);
    }

    // Close app cleanly
    await app.close();
    app = undefined;

    // Reopen in a new process to verify round-trip
    app = await playwright._electron.launch({
      args: [path.join(root, "tooling/verification/electron-bootstrap.cjs")],
      chromiumSandbox: true,
      timeout: 30000,
      env,
    });
    await app.firstWindow({ timeout: 30000 });

    const reopenResult = await app.evaluate(
      async (_, { userDir, staged }) => {
        const req = globalThis.__F002_REQUIRE;
        const path = req("node:path");
        const { ProtectionOwner, ElectronKeyProvider } = req(
          globalThis.__F002_BUILT_ENTRY,
        );

        const dsPath = path.join(userDir, "protected-dataset");
        const provider = new ElectronKeyProvider();
        const owner = new ProtectionOwner(
          { profileId: "synthetic-a", epoch: 1 },
          (p, epoch) => p === "synthetic-a" && epoch === 1,
          provider,
        );

        const reopenedDataSet = await owner.openProtected(dsPath);
        const searchHits = owner.search("شُعاع");
        const allRecords = owner.allRecords();
        const fileBytes = await owner.readSyntheticFile(staged);

        owner.lock();

        return {
          dataSetId: reopenedDataSet.dataSetId,
          searchHits,
          allRecords,
          fileBytesHex: fileBytes.toString("hex"),
        };
      },
      {
        userDir: user,
        staged: targetObservation.staged,
      },
    );

    expect(reopenResult.searchHits).toContain("A6-AR-شُعاع-النيل-٧٣");
    expect(reopenResult.allRecords).toEqual(fixture.records);
    expect(reopenResult.fileBytesHex).toBe(fixture.fileBytes.toString("hex"));

    const postReopenInventory = await inventoryFiles(user, rawMarkers);
    expect(postReopenInventory.length).toBeGreaterThan(0);
    for (const file of postReopenInventory) {
      expect(file.markerCount).toBe(0);
    }

    await testInfo.attach("f006-a01-a04-observation", {
      body: JSON.stringify(
        {
          target: `${process.platform}-${process.arch}`,
          scenarios: ["A-01", "A-02", "A-03", "A-04"],
          outcome: "passed",
          filesInspected: postReopenInventory.length,
          rawMarkersFound: 0,
          normalExitRoundTrip: true,
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
