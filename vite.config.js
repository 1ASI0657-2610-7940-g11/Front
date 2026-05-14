import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  base: process.env.GITHUB_PAGES === "true" ? "/Front/" : "/",
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:5101",
        changeOrigin: true
      },
      "/avatars": {
        target: "http://localhost:5101",
        changeOrigin: true
      }
    }
  }
});
