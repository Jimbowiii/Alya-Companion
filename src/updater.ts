import { getVersion } from "@tauri-apps/api/app";
import { check, type Update } from "@tauri-apps/plugin-updater";
import type { CompanionUpdateStatus } from "./types";

let pendingUpdate: Update | null = null;

async function clearPendingUpdate() {
  if (!pendingUpdate) return;

  try {
    await pendingUpdate.close();
  } catch {
    // On ignore une éventuelle erreur de nettoyage.
  }

  pendingUpdate = null;
}

export async function checkCompanionUpdate(): Promise<CompanionUpdateStatus> {
  const currentVersion = await getVersion();

  // Si on avait déjà récupéré une Update lors d'un ancien check,
  // on libère sa ressource avant d'en chercher une nouvelle.
  await clearPendingUpdate();

  const update = await check({
    timeout: 30_000,
  });

  if (!update) {
    return {
      current_version: currentVersion,
      latest_version: currentVersion,
      release_name: null,
      changelog: null,
      published_at: null,
      update_available: false,

      // On garde temporairement ces deux champs pour ne pas devoir
      // réécrire toute l'UI actuelle immédiatement.
      installer_available: false,
      checksum_available: false,

      repository: "Jimbowiii/Alya-Companion",
      development_build: import.meta.env.DEV,
    };
  }

  pendingUpdate = update;

  return {
    current_version: update.currentVersion || currentVersion,
    latest_version: update.version,
    release_name: `ALYA Companion ${update.version}`,
    changelog: update.body ?? null,
    published_at: update.date ?? null,
    update_available: true,

    // Avec le nouvel updater, on ne dépend plus du SHA-256 maison.
    // La signature Tauri remplit désormais ce rôle.
    installer_available: true,
    checksum_available: true,

    repository: "Jimbowiii/Alya-Companion",
    development_build: import.meta.env.DEV,
  };
}

export async function installCompanionUpdate(
  onProgress?: (percent: number | null) => void,
): Promise<void> {
  let update = pendingUpdate;

  // Cas où l'utilisateur clique sur Installer sans avoir fait
  // une vérification juste avant.
  if (!update) {
    update = await check({
      timeout: 30_000,
    });

    if (!update) {
      throw new Error("Aucune mise à jour ALYA Companion n'est disponible.");
    }

    pendingUpdate = update;
  }

  let downloaded = 0;
  let total: number | undefined;

  await update.downloadAndInstall(
    (event) => {
      if (event.event === "Started") {
        downloaded = 0;
        total = event.data.contentLength;

        if (total && total > 0) {
          onProgress?.(0);
        } else {
          onProgress?.(null);
        }

        return;
      }

      if (event.event === "Progress") {
        downloaded += event.data.chunkLength;

        if (total && total > 0) {
          const percent = Math.min(
            100,
            Math.round((downloaded / total) * 100),
          );

          onProgress?.(percent);
        }

        return;
      }

      if (event.event === "Finished") {
        onProgress?.(100);
      }
    },
    {
      timeout: 10 * 60 * 1000,
    },
  );
}