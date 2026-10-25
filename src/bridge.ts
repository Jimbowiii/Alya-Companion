import { invoke } from "@tauri-apps/api/core";
import type { AppState, CompanionUpdateStatus, Settings, SurfPatch, SurfState, ThemeStatus } from "./types";

export const api = {
  getState: () => invoke<AppState>("get_state"),
  saveSettings: (settings: Settings) => invoke<AppState>("save_settings", { settings }),
  refreshTheme: () => invoke<ThemeStatus>("refresh_theme_status"),
  updateTheme: () => invoke<string>("update_theme"),
  restoreTheme: () => invoke<string>("restore_latest_theme_backup"),
  listSurfPatches: () => invoke<SurfPatch[]>("list_surf_patches"),
  applySurfPatch: (patchId: string) => invoke<SurfState>("apply_surf_patch", { patchId }),
  restoreOriginalRom: () => invoke<SurfState>("restore_original_rom"),
  showVanity: (bounds: { x: number; y: number; width: number; height: number }) =>
    invoke<void>("show_vanity_webview", bounds),
  hideVanity: () => invoke<void>("hide_vanity_webview"),
  reloadVanity: () => invoke<void>("reload_vanity_webview"),
  checkCompanionUpdate: () => invoke<CompanionUpdateStatus>("check_companion_update"),
  installCompanionUpdate: () => invoke<string>("install_companion_update"),
};
