import assert from "node:assert/strict";
import test from "node:test";
import { launchEnvironment } from "./start.mjs";

const userHome = "/home/test-user";
const snapHome = `${userHome}/snap/code/268`;
const snapInstall = "/snap/code/268";

function snapEnvironment() {
  return {
    GSETTINGS_SCHEMA_DIR: `${snapHome}/.local/share/glib-2.0/schemas`,
    GIO_MODULE_DIR: `${userHome}/snap/code/common/.cache/gio-modules`,
    GDK_PIXBUF_MODULE_FILE: `${userHome}/snap/code/common/.cache/gdk-pixbuf-loaders.cache`,
    XDG_DATA_DIRS: `${snapHome}/.local/share:${snapInstall}/usr/share:/usr/local/share:/usr/share`,
    GTK_PATH: `${snapInstall}/usr/lib/x86_64-linux-gnu/gtk-3.0:/opt/host-gtk`,
    LD_LIBRARY_PATH: `/opt/host-libs:${snapInstall}/usr/lib/x86_64-linux-gnu`,
    DISPLAY: ":0",
    WAYLAND_DISPLAY: "wayland-0",
  };
}

function assertCleaned(environment) {
  assert.equal(environment.GSETTINGS_SCHEMA_DIR, undefined);
  assert.equal(environment.GIO_MODULE_DIR, undefined);
  assert.equal(environment.GDK_PIXBUF_MODULE_FILE, undefined);
  assert.equal(environment.XDG_DATA_DIRS, "/usr/local/share:/usr/share");
  assert.equal(environment.GTK_PATH, "/opt/host-gtk");
  assert.equal(environment.LD_LIBRARY_PATH, "/opt/host-libs");
  assert.equal(environment.DISPLAY, ":0");
  assert.equal(environment.WAYLAND_DISPLAY, "wayland-0");
}

test("cleans inherited VS Code Snap paths when the integrated terminal has no SNAP_NAME", () => {
  assertCleaned(launchEnvironment(snapEnvironment(), "linux", userHome));
});

test("cleans inherited paths when SNAP_NAME identifies VS Code", () => {
  assertCleaned(launchEnvironment({ ...snapEnvironment(), SNAP_NAME: "code" }, "linux", userHome));
});

test("preserves custom host paths in a normal Linux environment", () => {
  const source = {
    GSETTINGS_SCHEMA_DIR: "/opt/custom-app/schemas",
    GIO_MODULE_DIR: "/opt/custom-app/gio-modules",
    GDK_PIXBUF_MODULE_FILE: "/opt/custom-app/pixbuf-loaders.cache",
    XDG_DATA_DIRS: "/opt/custom-app/share:/usr/local/share:/usr/share",
    GTK_PATH: "/opt/custom-app/gtk",
    LD_LIBRARY_PATH: "/opt/custom-app/lib",
    DISPLAY: ":0",
    WAYLAND_DISPLAY: "wayland-0",
  };
  assert.deepEqual(launchEnvironment(source, "linux", userHome), source);
});

test("does not mutate the caller's environment during cleanup", () => {
  const source = snapEnvironment();
  const original = { ...source };
  const environment = launchEnvironment(source, "linux", userHome);
  assert.notEqual(environment, source);
  assert.deepEqual(source, original);
});

test("leaves Windows and macOS environments unchanged", () => {
  const source = { ...snapEnvironment(), SNAP_NAME: "code" };
  for (const platform of ["win32", "darwin"]) {
    assert.deepEqual(launchEnvironment(source, platform, userHome), source);
  }
});
