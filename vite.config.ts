import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  publicDir: mode === "library" ? false : "public",
  build:
    mode === "library"
      ? {
          outDir: "dist",
          emptyOutDir: false,
          lib: {
            entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
            formats: ["es"],
            fileName: "noteboard",
          },
          rollupOptions: { external: ["vue", "@lucide/vue"] },
        }
      : { outDir: "demo-dist", emptyOutDir: true },
}));
