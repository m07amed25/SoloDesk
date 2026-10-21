import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

export class EvidenceCollector {
  constructor(feature = "F010") {
    this.feature = feature;
    this.records = [];
    this.startTime = new Date().toISOString();
  }

  recordScenario(scenarioData) {
    const record = {
      feature: this.feature,
      scenarioId: scenarioData.scenarioId,
      name: scenarioData.name,
      covers: scenarioData.covers || [],
      timestamp: new Date().toISOString(),
      environment: {
        os: `${os.type()} ${os.release()} ${os.arch()}`,
        node: process.version,
        locale: process.env.LANG || "en_US.UTF-8",
      },
      status: scenarioData.passed ? "PASSED" : "FAILED",
      assertions: scenarioData.assertions || 0,
      details: scenarioData.details || {},
      defects: scenarioData.defects || [],
    };
    this.records.push(record);
    return record;
  }

  generateReport(outputPath = ".verification/f010-evidence.json") {
    let gitCommit = "unknown";
    try {
      gitCommit = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
    } catch {
      // ignore
    }

    const report = {
      feature: this.feature,
      gitCommit,
      generatedAt: new Date().toISOString(),
      totalScenarios: this.records.length,
      passedScenarios: this.records.filter((r) => r.status === "PASSED").length,
      failedScenarios: this.records.filter((r) => r.status === "FAILED").length,
      records: this.records,
    };

    const dir = path.dirname(path.resolve(outputPath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
      path.resolve(outputPath),
      JSON.stringify(report, null, 2),
      "utf-8",
    );
    return report;
  }
}
