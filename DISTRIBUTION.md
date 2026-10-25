# Distribution Alya Companion

## Première installation publique

1. Créer le dépôt GitHub `Jimbowiii/Alya-Companion`.
2. Pousser le projet dans ce dépôt.
3. Créer/pousser le tag `v1.0.0-rc.1`.
4. GitHub Actions construit automatiquement Windows et publie la release avec :
   - `Alya-Companion-Windows-x64-setup.exe`
   - `Alya-Companion-Windows-x64-setup.exe.sha256`
   - le MSI généré par Tauri.
5. Distribuer l'EXE de setup aux utilisateurs.

## Versions suivantes

Pour chaque nouvelle version, incrémenter la version dans :

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

Puis publier un tag correspondant (`v1.0.0-rc.2`, `v1.0.0`, `v1.0.1`, etc.).

Les installations existantes détectent la nouvelle release et proposent la mise à jour depuis Alya Companion. L'utilisateur final n'a pas à télécharger les sources ni à utiliser PowerShell.

## Important

Le dépôt et les noms d'assets font partie du contrat de mise à jour. Si le repo est renommé, modifier `ALYA_COMPANION_REPO`. Si le nom de l'installateur change, modifier aussi `ALYA_COMPANION_INSTALLER` et `ALYA_COMPANION_INSTALLER_SHA256`.
