export type Settings = {
  pokemmo_dir: string;
  rom_path: string;
  vanity_url: string;
  accent_color: string;
  hidden_tabs: string[];
  tab_order: string[];
  dashboard_modules: string[];
};

export type ThemeStatus = {
  local_version: string | null;
  latest_version: string | null;
  release_name: string | null;
  changelog: string | null;
  published_at: string | null;
  update_available: boolean;
  asset_name: string | null;
  backup_available: boolean;
};

export type SurfPatch = {
  id: string;
  name: string;
  description: string;
  compatibility?: string | null;
  patch_file: string;
  patch_sha256?: string | null;
  expected_source_sha256?: string | null;
  expected_output_sha256?: string | null;
};

export type SurfState = {
  managed_rom_path: string | null;
  active_patch_id: string | null;
  active_patch_name: string | null;
  original_backup_path: string | null;
  rom_sha256: string | null;
};

export type AppState = {
  settings: Settings;
  pokemmo_detected: boolean;
  pokemmo_running: boolean;
  theme_installed: boolean;
  theme_status: ThemeStatus | null;
  surf_state: SurfState;
};

export type CompanionUpdateStatus = {
  current_version: string;
  latest_version: string | null;
  release_name: string | null;
  changelog: string | null;
  published_at: string | null;
  update_available: boolean;
  installer_available: boolean;
  checksum_available: boolean;
  repository: string;
  development_build: boolean;
};
