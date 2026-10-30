import { invoke } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";
import { open, confirm } from "@tauri-apps/plugin-dialog";
import { copyFile, exists, mkdir, remove } from "@tauri-apps/plugin-fs";
import { saveAndroidSurfActivePatch } from "./sync";

export type MobileSurfState = {
  romUri: string;
  romLabel: string;
  backupPath: string;
  originalSha256: string;
  activePatchId: string | null;
  activePatchName: string | null;
  activeOutputSha256: string | null;
  selectedAt: number;
};

export type MobileSurfPatchResult = {
  patchId: string;
  patchName: string;
  outputPath: string;
  outputSha256: string;
  sourceSha256: string;
};

const STORAGE_KEY = "alya-mobile-surf-rom-v2";
const SURF_DIR = "surf-mobile";
const BACKUP_FILE = "original-rom.nds";

export function readMobileSurfState(): MobileSurfState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MobileSurfState>;
    if (!parsed.romUri || !parsed.backupPath || !parsed.originalSha256) return null;
    return {
      romUri: parsed.romUri,
      romLabel: parsed.romLabel || "ROM Pokémon Blanche",
      backupPath: parsed.backupPath,
      originalSha256: parsed.originalSha256,
      activePatchId: parsed.activePatchId ?? null,
      activePatchName: parsed.activePatchName ?? null,
      activeOutputSha256: parsed.activeOutputSha256 ?? null,
      selectedAt: parsed.selectedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

function writeMobileSurfState(state: MobileSurfState | null) {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // The Surf tool remains usable during this session even if localStorage is unavailable.
  }
}

function labelFromUri(uri: string) {
  try {
    const decoded = decodeURIComponent(uri);
    const last = decoded.split(/[\\/]/).filter(Boolean).pop() || "ROM Pokémon Blanche";
    const colonPart = last.split(":").pop() || last;
    return colonPart.toLowerCase().endsWith(".nds") ? colonPart : "ROM Pokémon Blanche sélectionnée";
  } catch {
    return "ROM Pokémon Blanche sélectionnée";
  }
}

async function surfDirectory() {
  const base = await appDataDir();
  const dir = await join(base, SURF_DIR);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function chooseMobileSurfRom(userId: string): Promise<MobileSurfState | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    title: "Choisir la ROM Pokémon Blanche utilisée par PokeMMO",
    filters: [{ name: "ROM Nintendo DS", extensions: ["nds"] }],
  });
  if (!selected || Array.isArray(selected)) return null;

  const dir = await surfDirectory();
  const backupPath = await join(dir, BACKUP_FILE);
  if (await exists(backupPath)) {
    try { await remove(backupPath); } catch {}
  }

  // Android returns a content:// URI. The dialog grants it to the fs scope,
  // while persisted-scope keeps that grant available after an app restart.
  await copyFile(selected, backupPath);
  const originalSha256 = await invoke<string>("mobile_surf_hash_file", { path: backupPath });

  const state: MobileSurfState = {
    romUri: selected,
    romLabel: labelFromUri(selected),
    backupPath,
    originalSha256,
    activePatchId: null,
    activePatchName: null,
    activeOutputSha256: null,
    selectedAt: Date.now(),
  };
  writeMobileSurfState(state);
  await saveAndroidSurfActivePatch(userId, null);
  return state;
}

export async function applyMobileSurfPatch(
  userId: string,
  state: MobileSurfState,
  patchId: string,
): Promise<MobileSurfState> {
  const accepted = await confirm(
    "Ferme complètement PokeMMO avant de modifier la ROM. Continuer ?",
    { title: "ALYA Surf Manager", kind: "warning" },
  );
  if (!accepted) throw new Error("__cancelled__");

  if (!(await exists(state.backupPath))) {
    throw new Error("Le backup original ALYA n'existe plus. Sélectionne à nouveau ta ROM.");
  }

  const result = await invoke<MobileSurfPatchResult>("mobile_surf_apply_patch", {
    sourcePath: state.backupPath,
    patchId,
  });

  try {
    // Always overwrite the user-selected ROM from a freshly patched copy of
    // the ORIGINAL backup, never from the previously patched ROM.
    await copyFile(result.outputPath, state.romUri);
  } catch (error) {
    throw new Error(
      `Le patch a été généré mais Android a refusé l'écriture dans la ROM sélectionnée. Resélectionne la ROM pour renouveler l'autorisation. (${String(error)})`,
    );
  } finally {
    try { await remove(result.outputPath); } catch {}
  }

  const next: MobileSurfState = {
    ...state,
    activePatchId: result.patchId,
    activePatchName: result.patchName,
    activeOutputSha256: result.outputSha256,
  };
  writeMobileSurfState(next);
  await saveAndroidSurfActivePatch(userId, result.patchId);
  return next;
}

export async function restoreMobileSurfOriginal(
  userId: string,
  state: MobileSurfState,
): Promise<MobileSurfState> {
  const accepted = await confirm(
    "Ferme complètement PokeMMO avant de restaurer la ROM originale. Continuer ?",
    { title: "ALYA Surf Manager", kind: "warning" },
  );
  if (!accepted) throw new Error("__cancelled__");

  if (!(await exists(state.backupPath))) {
    throw new Error("Le backup original ALYA n'existe plus. Sélectionne à nouveau ta ROM.");
  }

  await copyFile(state.backupPath, state.romUri);
  const next: MobileSurfState = {
    ...state,
    activePatchId: null,
    activePatchName: null,
    activeOutputSha256: null,
  };
  writeMobileSurfState(next);
  await saveAndroidSurfActivePatch(userId, null);
  return next;
}
