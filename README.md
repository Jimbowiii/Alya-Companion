# Alya Companion v1.0.0-rc.2

Alya Companion est un compagnon Windows externe pour PokeMMO. Il ne lance pas le jeu, n'injecte rien dans le processus PokeMMO et n'automatise aucune action en jeu.

## Modules inclus

- **AlyArchetype** : vérifie `Jimbowiii/AlyArchetype`, télécharge `AlyArchetype.zip`, sauvegarde l'ancienne version dans `data/mods/AlyArchetype.backup.zip`, puis remplace l'archive installée.
- **Surf Manager** : patches Togekiss Shiny et Primal Kyogre Shiny intégrés, backup de la ROM source, restauration et xdelta3 embarqué au build.
- **Vanity** : Crimson Core Vanity Booth intégré dans la fenêtre principale via WebView enfant Tauri.
- **Alya Companion Update** : vérifie les releases de `Jimbowiii/Alya-Companion`, télécharge l'installateur Windows, vérifie son SHA-256 puis lance l'installation. Les utilisateurs finaux n'ont pas besoin de Node, Rust, npm ou PowerShell pour les mises à jour.

## Développement local

Prérequis développeur : Node.js 22+, Rust 1.90+ et Visual Studio Build Tools avec Desktop development with C++.

```powershell
npm install
npm run tauri dev
```

## Build Windows

```powershell
npm run tauri build
```

Les installateurs sont générés dans :

```text
src-tauri\target\release\bundle\nsis\
src-tauri\target\release\bundle\msi\
```

## Distribution et mises à jour

Le workflow `.github/workflows/build-windows.yml` construit automatiquement les installateurs lorsqu'un tag `v*` est poussé. Il renomme l'installateur NSIS en :

```text
Alya-Companion-Windows-x64-setup.exe
```

et publie aussi :

```text
Alya-Companion-Windows-x64-setup.exe.sha256
```

Alya Companion exige ces deux assets avant d'autoriser une mise à jour depuis l'application.

### Dépôt attendu

Le code utilise actuellement :

```text
Jimbowiii/Alya-Companion
```

Si le dépôt final porte un autre nom, modifier `ALYA_COMPANION_REPO` dans `src-tauri/src/lib.rs` avant la première release distribuée.

### Tester le cycle de mise à jour RC

1. Publier `v1.0.0-rc.2` et installer son `.exe`.
2. Modifier l'application et passer les versions de `package.json`, `src-tauri/Cargo.toml` et `src-tauri/tauri.conf.json` à `1.0.0-rc.2`.
3. Publier le tag `v1.0.0-rc.2`.
4. Ouvrir la version rc.1 : elle détectera rc.2 et proposera **Mettre à jour**.

Le checker compare les releases avec SemVer. Une build RC accepte les prereleases suivantes puis la stable ; une build stable ignore les prereleases et reste sur le canal stable.

## Intégrité des mises à jour

Le workflow calcule un SHA-256 de l'installateur final. Avant de lancer l'installateur téléchargé, Alya Companion recalcule localement son SHA-256 et refuse l'installation en cas de différence.

Pour une distribution plus large, une signature Authenticode Windows reste recommandée afin de réduire les avertissements SmartScreen. Le mécanisme SHA-256 intégré ne remplace pas une signature de code Windows.

## Notes RC

- La mise à jour Alya Companion est basée sur GitHub Releases et nécessite que le dépôt `Jimbowiii/Alya-Companion` existe et contienne les assets attendus.
- Une build `npm run tauri dev` affiche `DEV` dans la barre latérale ; une build `npm run tauri build` ne l'affiche pas.
- Le Vanity Booth nécessite une connexion Internet.
