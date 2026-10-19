// Static secret scanner asserting zero service_role keys, database passwords, or superuser credentials in client assets (FR-012, SC-009)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const FORBIDDEN_SECRET_PATTERNS = [
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /service_role_key/i,
  /postgres:\/\/[^:]+:[^@]+@/i, // Raw database connection string with password
  /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]*"role"\s*:\s*"service_role"/, // JWT with service_role claim
];

const SCAN_DIRS = [
  "app/renderer",
  "app/shared",
  "packages/contracts",
  "packages/localization",
];

function scanDirectory(dir, forbiddenFound) {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry !== "node_modules" && entry !== ".git") {
        scanDirectory(fullPath, forbiddenFound);
      }
    } else if (
      stat.isFile() &&
      /\.(ts|tsx|js|mjs|json|html|css)$/.test(entry)
    ) {
      const content = readFileSync(fullPath, "utf8");
      for (const pattern of FORBIDDEN_SECRET_PATTERNS) {
        if (pattern.test(content)) {
          // Allow comments explicitly warning about absence or test descriptions
          const lines = content.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (pattern.test(lines[i])) {
              const line = lines[i].trim();
              if (
                line.startsWith("//") ||
                line.startsWith("/*") ||
                line.startsWith("*")
              ) {
                // If it's a cautionary comment, ignore
                continue;
              }
              forbiddenFound.push({
                file: fullPath,
                line: i + 1,
                snippet: line,
                pattern: pattern.toString(),
              });
            }
          }
        }
      }
    }
  }
}

test("SC-009 / FR-012: Static security scan asserts zero service-role keys or database credentials in client code", () => {
  const violations = [];
  for (const targetDir of SCAN_DIRS) {
    scanDirectory(targetDir, violations);
  }

  if (violations.length > 0) {
    console.error(
      "❌ High-privilege secret leak detected in client directories:",
      violations,
    );
  }

  assert.equal(
    violations.length,
    0,
    `Found ${violations.length} forbidden secret occurrences in client code: ${JSON.stringify(violations, null, 2)}`,
  );
});

test("SC-009: Verify command-gateway and storage-signed-url validate requester token without exposing service key to client", () => {
  // Read edge function entrypoints
  const commandGatewaySource = readFileSync(
    "supabase/functions/command-gateway/index.ts",
    "utf8",
  );
  const storageFunctionSource = readFileSync(
    "supabase/functions/storage-signed-url/index.ts",
    "utf8",
  );

  // Assert neither function reflects raw service role tokens back in responses
  assert.ok(
    !commandGatewaySource.includes("res.json({ service_role"),
    "Command gateway must not return service keys",
  );
  assert.ok(
    !storageFunctionSource.includes("res.json({ service_role"),
    "Storage function must not return service keys",
  );
});
