# Changelog

## [1.0.0-rc.9] - 2026-10-26

### 🐛 Correctif Supabase / réseau

- Correction de la politique CSP Tauri qui bloquait les requêtes réseau de `supabase-js` dans la version Windows distribuée.
- Ajout de `https://*.supabase.co` dans `connect-src` pour l'authentification et les appels API Supabase.
- Ajout de `wss://*.supabase.co` dans `connect-src` pour la compatibilité Supabase Realtime.
- Correction de l'erreur `AuthRetryableFetchError: Failed to fetch` affichée sur l'écran de connexion Alya Cloud.
- Aucun élargissement global du CSP : seules les origines Supabase sont ajoutées.
- Réécriture complète du changelog en UTF-8 propre afin de supprimer définitivement les caractères corrompus dans GitHub et Discord.

## [1.0.0-rc.8] - 2026-10-26

### 🐛 Correctifs du pipeline de publication

- Correction de la syntaxe YAML du workflow GitHub Actions.
- Le bloc `with:` de `tauri-action` est de nouveau correctement indenté.
- Conservation d'une seule lecture UTF-8 du changelog avec `-Encoding utf8`.
- Injection de `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` pendant le build de production.
- Correction des textes du webhook Discord qui contenaient encore des caractères mal encodés.
- Envoi du payload Discord explicitement en UTF-8.

## [1.0.0-rc.7] - 2026-10-26

### 🐛 Correctif de publication

- Correction du job GitHub Actions `Read changelog` qui échouait à cause du paramètre `-Encoding utf8` présent deux fois.
- Lecture du `CHANGELOG.md` explicitement en UTF-8.
- Vérification de l'injection des variables Supabase au moment du build.

## [1.0.0-rc.6] - 2026-10-26

### 🐛 Hotfix Alya Cloud

- Correction de la configuration Supabase dans les builds GitHub Actions.
- `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont injectées pendant la compilation Vite/Tauri.
- Correction de l'écran **Configuration Supabase requise** dans la version distribuée.
- Première correction de l'encodage du changelog utilisé par les GitHub Releases et les annonces Discord.

## [1.0.0-rc.5] - 2026-10-26

Cette RC5 introduit **Alya Cloud**, le nouveau système de comptes d'Alya Companion, ainsi qu'une importante évolution de la gestion des utilisateurs, de la sécurité, de la sidebar et de la personnalisation visuelle.

### ☁️ Alya Cloud

- Ajout d'un système de comptes Alya basé sur **Supabase**.
- Connexion et inscription par email.
- Ajout de la confirmation d'adresse email.
- La confirmation email fonctionne désormais aussi depuis un téléphone et ne dépend plus directement du lancement d'Alya via deep-link.
- Ajout de la connexion avec **Discord**.
- Ajout du callback OAuth `alya-companion://auth/callback`.
- Intégration robuste des deep-links Tauri, y compris lorsque Alya est déjà ouvert.
- Le traitement des deep-links combine l'écoute des événements et la récupération de l'URL courante afin de rendre la connexion Discord plus fiable.
- Ajout de la gestion single-instance afin qu'un callback d'authentification puisse être transmis à l'instance Alya déjà ouverte.
- Ajout d'une carte de profil **ALYA CLOUD** dans la partie basse de la sidebar.
- Affichage du nom de l'utilisateur connecté.
- Affichage du rôle Alya directement dans la carte profil.

### 🛡️ Rôles et permissions

Ajout de trois niveaux de permissions :

- `user`
- `Admin`
- `DEV`

Les rôles sont stockés dans `public.profiles.role` et contrôlés côté serveur.

Badges visuels :

- `user` : violet
- `Admin` : rouge
- `DEV` : doré

#### Utilisateur

Un utilisateur standard peut :

- utiliser Alya Companion normalement ;
- gérer sa propre feuille Shiny-War.

Il ne peut pas :

- accéder à Prépa Alya ;
- accéder à la gestion DEV ;
- consulter les feuilles Shiny-War des autres utilisateurs.

#### Admin

Les administrateurs disposent de l'outil **Prépa Alya**.

Prépa Alya permet :

- d'afficher la liste des utilisateurs Alya ;
- de sélectionner un utilisateur ;
- de consulter sa feuille Shiny-War ;
- d'accéder à ces informations uniquement en lecture.

Un Admin ne peut pas modifier la feuille Shiny-War d'un autre utilisateur.

#### DEV

Les utilisateurs DEV disposent de :

- Prépa Alya ;
- la gestion des utilisateurs.

Le panneau DEV permet :

- d'afficher les utilisateurs Alya ;
- de consulter leur rôle actuel ;
- d'attribuer les rôles `user`, `Admin` ou `DEV`.

Les changements de rôle passent par une fonction PostgreSQL sécurisée et ne reposent pas uniquement sur les contrôles du frontend.

### 🔐 Sécurité et sessions

- Ajout de politiques de sécurité Supabase / RLS pour protéger les données Alya Cloud.
- Les permissions utilisateur, Admin et DEV sont contrôlées côté base de données.
- Renforcement de la validation de session Supabase.
- Alya vérifie désormais que le compte authentifié existe toujours réellement côté Supabase.
- Alya vérifie également que le profil associé à la session existe toujours.
- Correction d'un problème de **session fantôme** pouvant conserver une session locale valide après la suppression du compte Supabase correspondant.
- Une session invalide ou associée à un compte supprimé ne permet plus d'accéder au Dashboard.
- La clé d'authentification locale Alya est isolée sous `alya-companion-auth`.

### 🎨 Personnalisation des fonds

- Ajout d'un bouton **crayon** dans l'en-tête des différents onglets.
- Le Dashboard conserve son fonctionnement actuel et ne possède pas ce bouton.
- Le crayon permet de modifier individuellement le fond de chaque onglet.
- Le sélecteur propose les différents fonds embarqués dans Alya Companion.
- Les images de fond peuvent être réutilisées librement entre les différents onglets.
- Le fond animé du Dashboard peut également être utilisé comme fond sur les autres pages.
- Le choix est sauvegardé indépendamment pour chaque onglet et conservé après redémarrage.
- Ajout d'une option permettant de réinitialiser un onglet sur son fond d'origine.
- Gestion spécifique des WebViews Vanity, Shinyboard et Forum afin que leur contenu ne passe pas devant le sélecteur de fonds.

Les onglets personnalisables sont :

- AlyArchetype
- Surf Manager
- Shiny-War
- Shinyboard
- Rotations
- Forum
- Vanity

### 🖼️ Interface et backgrounds

- Ajout et amélioration des backgrounds personnalisés sur plusieurs pages Alya.
- Nouveau background rouge/noir pour la sidebar.
- Harmonisation visuelle des différentes pages avec le nouveau style Alya.
- Conservation de la couleur d'accentuation personnalisée dans les nouveaux éléments d'interface.

### 🧭 Sidebar

La sidebar a été largement retravaillée.

- Nouvelle structure séparant clairement :
  - le logo et l'en-tête ;
  - la liste des onglets ;
  - le bloc utilisateur inférieur.
- Le logo Alya reste désormais fixe en haut.
- Seule la liste des onglets peut défiler.
- Le bloc inférieur de la sidebar reste fixe.
- Le footer ne se déplace plus lorsque les onglets sont scrollés.
- Settings n'est plus affiché comme un onglet classique dans la navigation principale.
- Les fonctions secondaires sont regroupées dans une rangée d'icônes en bas de la sidebar.

Pour un utilisateur DEV, cette rangée contient :

- Personnalisation
- Settings
- Prépa Alya
- Gestion utilisateurs DEV

- Les quatre icônes tiennent correctement sur une seule ligne.
- Prépa Alya et Gestion DEV ne sont jamais ajoutés à la liste principale des onglets.
- Conservation du bouton externe permettant de replier la sidebar.

### ↕️ Scroll de la sidebar

- Refonte du comportement de scroll de la liste des onglets.
- Ajout d'une scrollbar fine reprenant automatiquement la couleur d'accentuation Alya.
- Ajout d'un effet lumineux / néon sur le thumb.
- Suppression du fond noir précédemment visible derrière la scrollbar.
- Le track de la scrollbar est désormais transparent.
- Correction de plusieurs problèmes de positionnement vertical de la scrollbar.
- La scrollbar utilise correctement toute la hauteur disponible de la zone des onglets.

### 🌫️ Fondu des onglets

- Refonte complète de la zone de fondu située au-dessus du footer.
- Les onglets restent visibles plus longtemps avant d'atteindre le bloc inférieur.
- La hauteur de la zone de disparition a été réduite à environ la hauteur d'un onglet.
- Les onglets disparaissent progressivement avant d'atteindre le footer.
- Un onglet devenu suffisamment bas est totalement invisible au lieu de rester visible derrière le footer.
- La largeur du fondu correspond quasiment à celle d'un encart d'onglet.
- Le fondu dépasse l'encart d'environ un pixel pour conserver une transition propre.
- La zone de scrollbar est exclue du masque de fondu.
- La scrollbar peut donc descendre sous la zone de disparition sans devenir transparente.
- Le comportement a également été adapté lorsque la sidebar est repliée.

### ⚙️ Navigation et outils

- Déplacement de Settings vers la rangée d'outils fixe de la sidebar.
- Ajout conditionnel de Prépa Alya pour les Admin et DEV.
- Ajout conditionnel de la gestion utilisateurs pour les DEV.
- La navigation principale reste dédiée aux modules Alya :
  - Dashboard
  - AlyArchetype
  - Surf Manager
  - Shiny-War
  - Shinyboard
  - Rotations
  - Forum
  - Vanity

### 🐛 Corrections

- Correction de la connexion Discord via deep-link.
- Correction des callbacks OAuth pouvant être reçus avant que le frontend soit prêt.
- Correction de l'authentification Discord lorsque Alya est déjà ouvert.
- Correction du retour d'authentification avec une deuxième instance Windows.
- Correction de la confirmation email depuis mobile.
- Correction des sessions Supabase locales devenues invalides.
- Correction de l'accès au Dashboard après suppression d'un utilisateur côté Supabase.
- Correction de plusieurs problèmes d'affichage de la sidebar à faible hauteur de fenêtre.
- Correction du footer pouvant être recouvert par les onglets.
- Correction d'onglets restant visibles derrière le footer.
- Correction du fond noir de la scrollbar.
- Correction de la largeur et de la position du masque de fondu.
- Correction de la scrollbar affectée par le masque de disparition.
- Correction de l'alignement des quatre outils DEV dans la partie basse de la sidebar.

### 🔧 Technique

- Ajout de `tauri-plugin-deep-link`.
- Ajout de `tauri-plugin-opener`.
- Ajout de `tauri-plugin-single-instance`.
- Activation du support `deep-link` de `tauri-plugin-single-instance`.
- Intégration de Supabase Auth.
- Intégration des profils et rôles via Supabase Database.
- Mise en place des politiques RLS nécessaires aux permissions Alya Cloud.
- Mise en place d'une fonction PostgreSQL sécurisée pour les changements de rôle.
- Amélioration de la gestion des WebViews natives lors de l'ouverture d'interfaces superposées.
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
- Possibilité de réorganiser librement les onglets.
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
- Les futurs patchs sans preview utilisent automatiquement l'icône Surf par défaut.

### Amélioré

- Le Dashboard est désormais personnalisable.
- L'ordre des onglets est sauvegardé entre les sessions.
- Les modules affichés sur le Dashboard sont sauvegardés entre les sessions.
- La couleur d'accentuation personnalisée est conservée après redémarrage.
- Les anciens fichiers de configuration restent compatibles avec les nouveaux paramètres.
- Les rotations légendaires sont calculées localement sans dépendre d'une API externe.
- Le reset des rotations utilise l'heure UTC.
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
