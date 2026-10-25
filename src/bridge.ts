import { invoke } from "@tauri-apps/api/core";
import type {
  AppState,
  Settings,
  SurfPatch,
  SurfState,
  ThemeStatus,
} from "./types";

export type EmbeddedWebviewKind = "vanity" | "shinyboard" | "forum";

export const api = {
  getState: () =>
    invoke<AppState>("get_state"),

  saveSettings: (settings: Settings) =>
    invoke<AppState>("save_settings", { settings }),

  refreshTheme: () =>
    invoke<ThemeStatus>("refresh_theme_status"),

  updateTheme: () =>
    invoke<string>("update_theme"),

  restoreTheme: () =>
    invoke<string>("restore_latest_theme_backup"),

  listSurfPatches: () =>
    invoke<SurfPatch[]>("list_surf_patches"),

  applySurfPatch: (patchId: string) =>
    invoke<SurfState>("apply_surf_patch", { patchId }),

  restoreOriginalRom: () =>
    invoke<SurfState>("restore_original_rom"),

  showEmbeddedWebview: (
    kind: EmbeddedWebviewKind,
    bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    },
  ) =>
    invoke<void>("show_embedded_webview", {
      kind,
      ...bounds,
    }),

  hideEmbeddedWebviews: () =>
    invoke<void>("hide_embedded_webviews"),

  reloadEmbeddedWebview: (kind: EmbeddedWebviewKind) =>
    invoke<void>("reload_embedded_webview", { kind }),
};
