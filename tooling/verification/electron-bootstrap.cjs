// Test-only wrapper. Product main/preload/renderer sources remain unchanged.
const fs = require("node:fs");
const path = require("node:path");
const root = fs.realpathSync(process.env.F002_ROOT || process.cwd());
const owned = (name) => {
  const value = process.env[name];
  if (!value || !path.isAbsolute(value))
    throw new Error("owned-profile-required");
  const relative = path.relative(root, value).split(path.sep).join("/");
  if (
    !/^\.verification\/desktop-[\w-]+\/(userData|sessionData)$/.test(relative)
  )
    throw new Error("owned-profile-required");
  let current = root;
  for (const part of relative.split("/")) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink())
      throw new Error("symlink-profile");
  }
  const owner = JSON.parse(
    fs.readFileSync(
      path.join(root, relative.split("/").slice(0, 2).join("/"), ".owner.json"),
      "utf8",
    ),
  );
  if (owner.root !== root || !fs.statSync(value).isDirectory())
    throw new Error("owned-profile-required");
  return value;
};
const user = owned("F002_USER_DATA"),
  session = owned("F002_SESSION_DATA");
if (user === session) throw new Error("separate-profiles-required");
const { app } = require("electron");
if (app.isReady()) throw new Error("profile-too-late");
app.setPath("userData", user);
app.setPath("sessionData", session);
globalThis.__F002_REQUIRE = require;
globalThis.__F002_BUILT_ENTRY = path.join(root, ".vite/build/main.js");
require(globalThis.__F002_BUILT_ENTRY);
