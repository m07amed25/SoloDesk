import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  assetPath,
  trustedDevelopmentOrigin,
} from "../../../app/main/windows.ts";

const root = path.resolve(".vite/renderer/main_window");

test("asset origin allows canonical bundle files only", () => {
  assert.equal(
    assetPath("solodesk-app://ui/index.html", "GET", root),
    path.join(root, "index.html"),
  );
  for (const url of [
    "solodesk-app://evil/index.html",
    "solodesk-app://ui/../secret",
    "solodesk-app://ui/%2fsecret",
    "solodesk://open/home",
  ])
    assert.equal(assetPath(url, "GET", root), null);
  assert.equal(assetPath("solodesk-app://ui/index.html", "POST", root), null);
});

test("development origin is exact loopback", () => {
  assert.equal(
    trustedDevelopmentOrigin("http://127.0.0.1:5173/"),
    "http://127.0.0.1:5173",
  );
  assert.equal(trustedDevelopmentOrigin("https://example.com/"), null);
  assert.equal(trustedDevelopmentOrigin("http://localhost.evil:5173/"), null);
});
