import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { safePath, digest } from "./verification/artifacts.mjs";
import { parseRecord } from "./verification/records.mjs";
export function verifyStyleSources(root) {
  const file = safePath(root, "vendor/shadcn-ui/manifest.json");
  if (fs.statSync(file).size > 2097152) throw new Error("vendor-input-limit");
  const styles = parseRecord(fs.readFileSync(file, "utf8"));
  if (
    styles.license !== "MIT" ||
    !styles.version ||
    Object.keys(styles.files || {})
      .sort()
      .join(",") !== "LICENSE.md,tailwind.css"
  )
    throw new Error("vendor-manifest-invalid");
  for (const [name, hash] of Object.entries(styles.files)) {
    const source = safePath(root, `vendor/shadcn-ui/${name}`);
    if (
      fs.statSync(source).size > 2097152 ||
      digest(fs.readFileSync(source)) !== hash
    )
      throw new Error("vendor-integrity");
  }
  return styles;
}
export function inspectUI(root) {
  const styles = verifyStyleSources(root);
  const config = parseRecord(
    fs.readFileSync(safePath(root, "components.json"), "utf8"),
  );
  const components = fs
    .readdirSync(safePath(root, "app/renderer/components/ui"))
    .filter((n) => n.endsWith(".tsx"))
    .sort();
  return {
    framework: "shadcn/ui",
    style: config.style,
    tailwind: config.tailwind,
    aliases: config.aliases,
    registries: config.registries,
    components,
    styles: {
      version: styles.version,
      license: styles.license,
      source_package: styles.source_package,
    },
    generator_installed: fs.existsSync(
      path.join(root, "node_modules/shadcn/package.json"),
    ),
    registry_access: "not requested; local configuration only",
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    console.log(JSON.stringify(inspectUI(process.cwd()), null, 2));
  } catch {
    console.error("UI configuration or vendored stylesheet integrity failed");
    process.exitCode = 1;
  }
}
