# Changelog

## [1.0.0-rc.7] - 2026-10-26

### ðŸ› Correctif de publication

- Correction du job GitHub Actions **Read changelog** qui Ã©chouait Ã  cause du paramÃ¨tre `-Encoding utf8` prÃ©sent deux fois.
- Lecture du `CHANGELOG.md` explicitement en UTF-8 afin de conserver correctement les accents et les emojis dans les GitHub Releases et les annonces Discord.
- Injection vÃ©rifiÃ©e de `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` pendant le build de production.
- Aucun changement fonctionnel supplÃ©mentaire par rapport Ã  la RC6 : cette version corrige uniquement le pipeline de publication.

## [1.0.0-rc.6] - 2026-10-26

### 🐛 Correctifs de publication

- Correction de la configuration Supabase dans les builds GitHub Actions.
- `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont maintenant injectées pendant la compilation Vite/Tauri.
- Correction de l'écran **Configuration Supabase requise** qui pouvait apparaître dans la version distribuée alors que Supabase fonctionnait en développement local.
- Correction de l'encodage UTF-8 du changelog utilisé par les GitHub Releases et les annonces Discord.
- Les accents, apostrophes et emojis du changelog sont maintenant conservés correctement.

### 🔐 Alya Cloud

- Aucun changement de permissions ou de sécurité Supabase/RLS.
- La RC6 reprend les fonctionnalités Alya Cloud de la RC5 avec une configuration de production correcte.

## [1.0.0-rc.5] - 2026-10-26

Cette RC5 introduit **Alya Cloud**, le système de comptes d'Alya Companion, ainsi qu'une importante évolution de la gestion des utilisateurs, de la sécurité, de la sidebar et de la personnalisation visuelle.

### ☁️ Alya Cloud

- Ajout d'un système de comptes Alya basé sur **Supabase**.
- Connexion et inscription par email.
- Ajout de la confirmation d'adresse email.
- La confirmation email fonctionne également depuis un téléphone et ne dépend plus directement du lancement d'Alya via deep-link.
- Ajout de la connexion avec **Discord**.
- Ajout du callback OAuth `alya-companion://auth/callback`.
- Intégration robuste des deep-links Tauri, y compris lorsque Alya est déjà ouvert.
- Ajout de la gestion single-instance pour transmettre les callbacks à l'instance Alya existante.
- Ajout d'une carte de profil **ALYA CLOUD** dans la partie basse de la sidebar.
- Affichage du nom de l'utilisateur connecté et de son rôle.

### 🛡️ Rôles et permissions

Ajout des rôles :

- `user`
- `Admin`
- `DEV`

Les rôles sont stockés dans `public.profiles.role` et protégés côté Supabase.

Badges :

- `user` : violet
- `Admin` : rouge
- `DEV` : doré

#### user

- Utilisation normale d'Alya.
- Gestion de sa propre feuille Shiny-War.
- Aucun accès aux feuilles Shiny-War des autres utilisateurs.
- Aucun accès aux outils Admin/DEV.

#### Admin

- Ajout de **Prépa Alya**.
- Liste des utilisateurs Alya.
- Consultation en lecture seule de la feuille Shiny-War d'un autre utilisateur.

#### DEV

- Accès à Prépa Alya.
- Ajout du panneau de gestion des utilisateurs.
- Consultation du rôle de chaque utilisateur.
- Attribution sécurisée des rôles `user`, `Admin` et `DEV`.

Les changements de rôle passent par une fonction PostgreSQL sécurisée et ne reposent pas uniquement sur le frontend.

### 🔐 Sécurité et sessions

- Ajout et renforcement des politiques Supabase / RLS.
- Validation côté serveur des permissions utilisateur, Admin et DEV.
- Validation réelle de la session Supabase au démarrage.
- Vérification de l'existence du compte et du profil associés à la session.
- Correction des **sessions fantômes** après suppression d'un utilisateur Supabase.
- Une session locale invalide ne permet plus d'ouvrir le Dashboard.
- Utilisation de la clé locale d'authentification `alya-companion-auth`.

### 🎨 Personnalisation des fonds par onglet

- Ajout d'une icône **crayon** dans l'en-tête des onglets principaux, sauf Dashboard.
- Sélecteur visuel permettant d'utiliser les fonds présents dans les assets Alya.
- Chaque onglet mémorise son propre fond.
- Persistance des choix après redémarrage.
- Possibilité de restaurer le fond par défaut.
- Le fond animé du Dashboard peut être réutilisé sur les autres onglets.
- Gestion spécifique des WebViews Vanity, Shinyboard et Forum pendant l'ouverture du sélecteur.

Onglets personnalisables :

- AlyArchetype
- Surf Manager
- Shiny-War
- Shinyboard
- Rotations
- Forum
- Vanity

### 🧭 Sidebar

- Refonte de la sidebar en trois zones : header, navigation scrollable et footer fixe.
- Le logo Alya reste fixe en haut.
- Seule la liste des onglets défile.
- Le bloc inférieur reste fixe.
- Settings n'est plus un onglet principal.
- Ajout d'une rangée d'outils fixe dans le footer.
- Pour un DEV : Personnalisation, Settings, Prépa Alya et Gestion utilisateurs tiennent sur une seule ligne.
- Prépa Alya et Gestion DEV ne sont jamais affichés dans la navigation principale.
- Conservation du bouton externe de collapse.

### ↕️ Scrollbar et fondu

- Scrollbar affinée et harmonisée avec la couleur d'accentuation Alya.
- Track transparent.
- Suppression du fond noir derrière la scrollbar.
- Conservation du glow néon.
- Correction de la hauteur et du positionnement vertical de la zone scrollable.
- Réduction de la zone de fondu à environ la hauteur d'un onglet.
- Les onglets restent visibles plus longtemps et disparaissent juste avant le footer.
- La largeur du fondu correspond à l'encart d'un onglet actif, avec environ 1 px de débord.
- La zone de scrollbar est exclue du masque de fondu.
- La scrollbar peut descendre sous la zone de disparition sans être masquée.
- Comportement adapté également en sidebar collapsed.

### 🐛 Corrections

- Correction de la connexion Discord via deep-link.
- Correction des callbacks OAuth reçus lorsque le frontend n'est pas encore prêt.
- Correction du retour d'authentification lorsque Alya est déjà ouvert.
- Correction de la confirmation email depuis mobile.
- Correction des sessions Supabase locales invalides.
- Correction de l'accès au Dashboard après suppression d'un utilisateur.
- Correction de plusieurs problèmes de sidebar à faible hauteur de fenêtre.
- Correction du footer pouvant être recouvert par les onglets.
- Correction d'onglets restant visibles derrière le footer.
- Correction du fond noir de la scrollbar.
- Correction de la scrollbar impactée par le masque de disparition.
- Correction de l'alignement des quatre outils DEV.

### 🔧 Technique

- Ajout de `tauri-plugin-deep-link`.
- Ajout de `tauri-plugin-opener`.
- Ajout de `tauri-plugin-single-instance`.
- Activation de la feature `deep-link` de `tauri-plugin-single-instance`.
- Intégration de Supabase Auth, Database et des profils Alya.
- Mise en place des politiques RLS nécessaires aux permissions Alya Cloud.
- Mise en place d'une fonction PostgreSQL sécurisée pour les changements de rôle.
- Amélioration de la gestion des WebViews natives lors de l'ouverture d'overlays.
- Persistance locale des fonds personnalisés par onglet.

## [1.0.0-rc.4] - 2026-10-25

### Ajouté

- Nouvel onglet **Shinyboard**, intégré directement dans Alya Companion.
- Nouvel onglet **Rotations** pour suivre les légendaires fuyards de Kanto et Johto.
- Affichage de la rotation actuelle, de la prochaine rotation et de la rotation suivante en cache.
- Compte à rebours jusqu'au prochain reset mensuel des légendaires.
- Bouton **✨ Shiny** dans l'onglet Rotations permettant de basculer les sprites animés entre leur version normale et shiny.
- Nouvel onglet **Forum** intégrant le forum officiel PokeMMO.
- Nouveau panneau de personnalisation accessible depuis l'icône clé à molette.
- Possibilité d'afficher ou masquer les onglets de la barre latérale.
- Possibilité de réorganiser librement les onglets avec glisser-déposer ou boutons haut/bas.
- Possibilité de modifier la couleur d'accentuation de l'application.
- Nouveau bouton crayon sur le Dashboard permettant de choisir les modules affichés.
- Nouveau logo Alya Companion utilisé dans l'interface.
- Nouveau système de mise à jour signé basé sur l'updater officiel Tauri.
- Nouveau système de changelog utilisé automatiquement par les GitHub Releases et les annonces Discord.

### Surf Manager

- Ajout du patch **Demanta**.
- Ajout du patch **Lugia Shiny**.
- Ajout du patch **Lugia**.
- Ajout du patch **Latias Shiny**.
- Conservation des patchs **Togekiss Shiny**, **Kyogre Shiny** et **Primal Kyogre Shiny**.
- Ajout de previews visuelles pour les Pokémon disponibles dans le Surf Manager.
- Previews recadrées et centrées pour un meilleur rendu dans les cartes.
- Les futurs patchs sans preview utilisent automatiquement l'icône Surf par défaut.

### Amélioré

- Le Dashboard est désormais personnalisable.
- L'ordre des onglets est sauvegardé entre les sessions.
- Les modules affichés sur le Dashboard sont sauvegardés entre les sessions.
- La couleur d'accentuation personnalisée est conservée après redémarrage.
- Les anciens fichiers de configuration restent compatibles avec les nouveaux paramètres.
- L'encart principal du Dashboard a été rendu plus compact.
- Amélioration de la présentation des cartes du Surf Manager.
- Amélioration de la fiabilité de la réorganisation des onglets sous Windows/WebView2.
- Les rotations légendaires sont calculées localement sans dépendre d'une API externe.
- Le reset des rotations utilise l'heure UTC afin de rester correct malgré les changements d'heure.
- Les futures mises à jour Windows peuvent être installées par-dessus la version existante sans désinstallation manuelle.
- Les mises à jour Alya Companion sont vérifiées par signature cryptographique avant installation.
- Les GitHub Releases utilisent automatiquement le changelog correspondant à la version publiée.
- Les annonces Discord incluent automatiquement le changelog de la nouvelle version.

### Corrigé

- Correction de la persistance des nouveaux paramètres de personnalisation.
- Correction du système de réorganisation des onglets dans Tauri/WebView2.
- Correction du centrage des previews Pokémon dans le Surf Manager.
- Correction de plusieurs problèmes de configuration liés à l'intégration du nouvel updater Tauri.
- Correction de la compatibilité entre les nouveaux paramètres frontend et leur sauvegarde côté Rust.
