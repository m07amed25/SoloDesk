import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => ({
  root: fileURLToPath(new URL("./app/renderer", import.meta.url)),
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "solodesk-content-security-policy",
      transformIndexHtml() {
        const development = command === "serve";
        return [
          {
            tag: "meta",
            attrs: {
              "http-equiv": "Content-Security-Policy",
              content: [
                "default-src 'self'",
                `script-src 'self'${development ? " 'unsafe-inline'" : ""}`,
                "style-src 'self' 'unsafe-inline'",
                `connect-src 'self'${development ? " ws://127.0.0.1:* ws://localhost:*" : ""}`,
                "img-src 'self' data: https://lh3.googleusercontent.com",
                "font-src 'self'",
                "object-src 'none'",
                "base-uri 'self'",
                "frame-src 'none'",
              ].join("; "),
            },
            injectTo: "head-prepend",
          },
        ];
      },
    },
  ],
  server: { host: "127.0.0.1" },
  build: { outDir: "../../.vite/renderer/main_window", emptyOutDir: true },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./app/renderer", import.meta.url)),
      "@public": fileURLToPath(new URL("./public", import.meta.url)),
    },
  },
}));
