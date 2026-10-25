import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    strictPort: true,
    port: 1420,
    // Rust/Cargo produit des exécutables verrouillés sous Windows.
    // Vite ne doit jamais essayer de les surveiller.
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
