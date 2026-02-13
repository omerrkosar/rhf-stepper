import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import fumadocsMdx from "fumadocs-mdx/vite";
import path from "node:path";
import { docs } from "./source.config";

export default defineConfig({
  plugins: [tailwindcss(), fumadocsMdx({ docs }), reactRouter()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
      "@/.source": path.resolve(__dirname, "./.source"),
    },
  },
});
