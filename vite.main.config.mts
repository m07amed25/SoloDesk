import { defineConfig } from "vite";

export default defineConfig((environment) => ({
  define: "forgeConfig" in environment ? {} : {
    MAIN_WINDOW_VITE_DEV_SERVER_URL: "undefined",
    MAIN_WINDOW_VITE_NAME: JSON.stringify("main_window"),
  },
  build: {
    outDir: ".vite/build",
    lib: { entry: "app/main/main.ts", formats: ["cjs"], fileName: () => "main.js" },
    rolldownOptions: { external: [/^node:/, "electron", "better-sqlite3", "better-sqlite3-multiple-ciphers"] },
  },
}));
