import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// SPA build. In dev, proxy /api → the API Worker (same-origin → cookies just work).
// In production, set VITE_API_BASE to the deployed API Worker URL (CORS + credentials).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
