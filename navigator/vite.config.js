import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    proxy: {
      // Reindirizza le chiamate API al tuo server Node (Porta 8000)
      "/api": "http://localhost:8000",
      "/db": "http://localhost:8000",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
