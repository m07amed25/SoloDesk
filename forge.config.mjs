import { VitePlugin } from "@electron-forge/plugin-vite";

export default {
  packagerConfig: { asar: true, name: "SoloDesk" },
  // The shell does not load native modules. Enable their rebuilds with database work.
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
