import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const envDir = fileURLToPath(new URL("../", import.meta.url));

export default defineConfig({
  plugins: [react()],
  envDir,
  clearScreen: false,
  server: {
    host: "0.0.0.0",
    port: 1421,
    strictPort: true,
    // Gradle/Tauri continuously create, replace and merge native build files
    // under these directories. Watching them on Windows can throw EBUSY while
    // Android is compiling JNI libraries. They are never frontend source files.
    watch: {
      ignored: [
        "**/src-tauri/gen/**",
        "**/src-tauri/target/**",
        "**/target/**",
        "**/.gradle/**",
        "**/build/**",
      ],
    },
  },
});
