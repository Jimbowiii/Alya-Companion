Alya Companion RC4 - Comptes Alya V1 + V2

IMPORTANT : ce ZIP part de la derniere version UI (Settings en icone, Dashboard auto, fonds, sidebar, scrolls) et ajoute le systeme de compte Alya Companion.

Inclus :
V1
- connexion email + mot de passe
- creation de compte + pseudo
- verification email
- recuperation mot de passe
- session persistante
- profil Alya + avatar
- deconnexion

V2
- synchronisation Shiny-War
- synchronisation preferences UI
- connexion Discord
- avatar Supabase Storage
- profil cloud

Installation :
1. Copier le contenu du ZIP a la racine du projet.
2. Lancer :
   Set-ExecutionPolicy -Scope Process Bypass
   .\APPLY-AUTH.ps1
3. Lire SETUP-COMPTES.md pour creer/configurer Supabase.
4. Executer supabase/alya_companion.sql dans le SQL Editor Supabase.
5. Copier .env.example vers .env et renseigner VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.
6. Ajouter alya-companion://auth/callback dans les Redirect URLs Supabase.
7. Tester :
   npm run build
   cargo check --manifest-path .\src-tauri\Cargo.toml
   npm run tauri dev

Ne jamais mettre une cle Supabase service_role dans Alya Companion.
