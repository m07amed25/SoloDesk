import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeContext } from "./context.mjs";
import { readRecord, envelope } from "./records.mjs";
import { safePath, allocate, writeRecord } from "./artifacts.mjs";
const options = new Set([
  "mode",
  "base",
  "out",
  "record",
  "context",
  "selection",
  "policy",
  "suites",
  "reports",
  "provider",
  "group",
  "target",
  "profile",
  "run-id",
  "attempt",
  "pr",
  "format",
]);
export function parseArgs(args) {
  const [command, ...tail] = args;
  if (command === "--help" || command === "help" || !command)
    return { command: "help" };
  if (
    ![
      "context",
      "select",
      "run",
      "aggregate",
      "inspect",
      "validate",
      "verify",
    ].includes(command)
  )
    throw new Error("invalid-command");
  const result = { command };
  for (let i = 0; i < tail.length; i += 2) {
    const key = tail[i]?.replace(/^--/, "");
    if (
      !tail[i]?.startsWith("--") ||
      !options.has(key) ||
      result[key] !== undefined ||
      !tail[i + 1] ||
      tail[i + 1].startsWith("--")
    )
      throw new Error("invalid-option");
    result[key] = tail[i + 1];
  }
  if (result.format && !["json", "text"].includes(result.format))
    throw new Error("invalid-format");
  return result;
}
export function output(root, out, value) {
  if (out) {
    const bits = out.split("/");
    if (bits.length < 3 || bits[0] !== ".verification")
      throw new Error("owned-output-required");
    const parent = bits.slice(0, 2).join("/");
    if (!fs.existsSync(safePath(root, parent))) allocate(root, bits[1]);
    writeRecord(root, out, value);
  }
  return value;
}
export async function main(args, root = process.cwd()) {
  const o = parseArgs(args);
  if (o.command === "help")
    return {
      exit: 0,
      value: {
        commands: [
          "context",
          "select",
          "run",
          "aggregate",
          "inspect",
          "validate",
          "verify",
        ],
        notice:
          "No command grants approval, merge or service mutation authority.",
      },
    };
  if (o.command === "validate") {
    if (!o.record) throw new Error("record-required");
    const record = readRecord(safePath(root, o.record), { validate: false });
    if (record.schema === "solodesk.verification.pack") {
      const { validatePack } = await import("./delivery.mjs");
      const value = validatePack(record);
      return { exit: value.complete ? 0 : 1, value };
    }
    const { validateRecord } = await import("./records.mjs");
    validateRecord(record);
    return {
      exit: 0,
      value: {
        valid: true,
        schema: record.schema,
        owner_source_verification: "required",
      },
    };
  }
  if (o.command === "context") {
    const event = process.env.GITHUB_EVENT_PATH
      ? JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"))
      : undefined;
    const context = makeContext(root, {
      mode: o.mode || "local",
      base: o.base,
      event,
    });
    return { exit: 0, value: output(root, o.out, context) };
  }
  // Story-specific commands are loaded only after their actual implementation exists.
  const file = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    `${o.command === "verify" || o.command === "run" ? "run-suite" : o.command === "inspect" ? "inspect-provider" : o.command === "select" ? "selection" : "aggregate"}.mjs`,
  );
  if (!fs.existsSync(file))
    return {
      exit: 2,
      value: envelope("summary", "unavailable-command", {
        automated_ready: false,
        findings: [{ code: "command-unavailable" }],
      }),
    };
  const module = await import(file);
  return module.command(root, o, output);
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const { exit, value } = await main(process.argv.slice(2));
    if (
      process.argv.includes("--format") &&
      process.argv[process.argv.indexOf("--format") + 1] === "text"
    )
      console.log(
        `Verification outcome (exit ${exit}; owner-source verification required)\n${JSON.stringify(value, null, 2)}`,
      );
    else console.log(JSON.stringify(value, null, 2));
    process.exitCode = exit;
  } catch (error) {
    console.error(
      JSON.stringify({
        valid: false,
        code: /^[a-z-]+(?::|$)/.test(error.message)
          ? error.message.split(":")[0]
          : "tool-failure",
        owner_source_verification: "required",
      }),
    );
    process.exitCode = 2;
  }
}
