import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(() => ({
  root: fileURLToPath(new URL("./web/auth", import.meta.url)),
  publicDir: false as const,
  base: "/auth/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: fileURLToPath(new URL("./.vite/hosted/auth", import.meta.url)),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./web/auth", import.meta.url)),
    },
  },
}));
