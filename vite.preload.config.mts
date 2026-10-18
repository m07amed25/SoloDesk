import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: ".vite/build",
    emptyOutDir: false,
    lib: {
      entry: "app/preload/preload.ts",
      formats: ["cjs"],
      fileName: () => "preload.cjs",
    },
    rolldownOptions: { external: [/^node:/, "electron"] },
  },
});
