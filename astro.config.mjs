// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve("./src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:8888",
          changeOrigin: true,
        },
        "/docs": {
          target: "http://localhost:8888",
          changeOrigin: true,
        },
      },
    },
  },
});
