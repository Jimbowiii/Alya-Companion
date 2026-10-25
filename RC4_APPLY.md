# Appliquer la RC4 sur le dépôt actuel

1. Extraire l'overlay RC4 à la racine du dépôt Alya-Companion et accepter le remplacement des fichiers.
2. Ne pas remplacer `.github/workflows` : l'overlay n'y touche pas, afin de conserver le workflow Discord/forum actuel.
3. Exécuter `npm install` pour synchroniser `package-lock.json` avec la version RC4.
4. Tester avec `npm run tauri dev`.
5. Construire avec `npm run tauri build` avant publication.
6. Commit/push puis taguer `v1.0.0-rc.4`.
