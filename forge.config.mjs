import { VitePlugin } from "@electron-forge/plugin-vite";

export default {
  packagerConfig: {
    asar: true,
    name: "SoloDesk",
    // Forge's Vite plugin otherwise ignores all node_modules, including the
    // external encrypted adapter required by the main bundle.
    ignore: (file) => file !== "" && file !== "/node_modules" &&
      !file.startsWith("/.vite") &&
      !file.startsWith("/node_modules/better-sqlite3-multiple-ciphers"),
    ...(process.env.F006_ELECTRON_ZIP_DIR ? { electronZipDir: process.env.F006_ELECTRON_ZIP_DIR } : {}),
  },
  // The candidate ships platform N-API binaries. Verify the packaged binary on each
  // target; a source rebuild is not a substitute for a target-specific load test.
  rebuildConfig: { types: [] },
  makers: [],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "app/main/main.ts",
          config: "vite.main.config.mts",
          target: "main",
        },
        {
          entry: "app/preload/preload.ts",
          config: "vite.preload.config.mts",
          target: "preload",
        },
      ],
      renderer: [{ name: "main_window", config: "vite.config.mts" }],
      hotRestart: true,
    }),
  ],
};
