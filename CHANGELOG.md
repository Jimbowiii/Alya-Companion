# Changelog

## [1.0.0-rc.11] - 2026-10-28

RC11 agrandit fortement ALYA Companion avec de nouveaux modules de jeu, des outils communautaires, une meilleure organisation de la sidebar et plusieurs automatisations utiles au quotidien.

### 👑 Nouveau rôle GOUROU

- Ajout du rôle `GOUROU` dans la hiérarchie des comptes : `DEV > GOUROU > ADMIN > user`.
- Le rôle GOUROU dispose des outils avancés de gestion et de préparation accessibles aux DEV.
- Un GOUROU peut attribuer uniquement les rôles `ADMIN` et `user`.
- Un GOUROU ne peut pas attribuer `DEV` ou `GOUROU` et ne peut pas modifier les comptes protégés de ces deux niveaux.
- Les restrictions sont appliquées côté Supabase et pas uniquement dans l'interface.
- Nouveau style de rôle : GOUROU rouge vif et ADMIN vert fluo.
- La liste des utilisateurs respecte désormais la hiérarchie des rôles.

### 🏅 Gestion des badges améliorée

- Remplacement des longues listes de badges par un volet déroulant compact pour chaque joueur.
- Le volet permet d'attribuer, retirer et réordonner les badges sans faire déborder les lignes utilisateurs.
- Correction du niveau d'empilement afin que le volet ouvert reste toujours au premier plan.

### 📣 Événements globaux sur le Dashboard

- Ajout d'un éditeur d'événement accessible aux DEV et GOUROU.
- Un événement peut contenir un titre, un texte libre, une couleur de titre, une image de fond et une date/heure de fin.
- Le Dashboard de tous les utilisateurs affiche automatiquement l'événement actif.
- Ajout d'un compte à rebours en temps réel au format `3j 5h 43min 39sec`.
- L'événement disparaît automatiquement lorsqu'il expire.
- Synchronisation via Supabase Realtime avec rafraîchissement de secours.
- Les liens HTTP/HTTPS présents dans le texte de l'événement sont automatiquement cliquables et s'ouvrent dans le navigateur externe.

### 🌱 Nouvel onglet Baies

- Ajout d'un module dédié à l'autonomie Mépo avec six emplacements de personnages : 2 Mépo, 2 Ceriz, 1 Pécha et 1 Fraive.
- Les noms des personnages sont personnalisables et sauvegardés localement.
- Affichage des besoins en graines par personnage et du stock global nécessaire pour une tournée complète.
- Total global affiché : 2 496 graines.
- Ajout d'un fond dédié à la culture de baies.
- Refonte responsive et augmentation générale de la taille des textes pour une meilleure lisibilité.

### ⏳ Timers de culture et notifications Windows

- Chaque personnage dispose d'un chrono de culture individuel persistant.
- Mode `8h` :
  - Mépo : arrosage à 8h, arrosage à 16h, récolte à 20h.
  - Ceriz / Pécha / Fraive : arrosage à 8h, récolte à 16h.
- Mode `10h` : un seul arrosage à 10h pour toutes les baies, puis récolte à 20h pour Mépo et 16h pour les autres.
- Le mode 8h/10h est global et sauvegardé localement.
- Les timers continuent d'être surveillés même lorsque l'utilisateur quitte l'onglet Baies.
- Ajout des notifications Windows natives aux checkpoints.
- Notifications d'arrosage : `Arrose tes baies <baie> toi !`.
- Notifications de récolte : `Récolte tes baies <baie> toi !`.
- Si ALYA était fermé lors d'un checkpoint, l'étape dépassée est détectée au prochain lancement.

### ⚔️ Nouvel onglet Raids

- Ajout d'un module Raids natif avec six boss : Heatran, Cresselia, Meloetta, Cobaltium, Terrakium et Viridium.
- Chaque raid dispose d'une fiche d'escouades détaillant les quatre joueurs, Pokémon, objets, talents, natures, IV, EV et attaques.
- Ajout d'un plan de combat tour par tour avec les actions des quatre joueurs affichées côte à côte.
- Les tours peuvent être cochés et la progression est conservée localement.
- Ajout d'un fond dédié à l'onglet Raids avec rendu plein écran, centré et sans répétition.

### 🧰 Nouvelle bibliothèque Mods

- Ajout d'un onglet Mods natif pour gérer les mods PokeMMO directement depuis ALYA.
- Téléchargement et installation directement dans `PokeMMO/data/mods` sans passage manuel par le dossier Téléchargements.
- Gestion des fichiers `.mod` et `.zip`.
- Téléchargement sécurisé via fichier temporaire `.part` avant installation finale.
- Barre de progression et état `Installé / Non installé / Partiel`.
- Gestion des packs multi-fichiers, dont les packs nécessitant plusieurs parties.
- Support des téléchargements publics MediaFire, Google Drive, MEGA et HTTPS direct lorsque la ressource est publiquement accessible.
- Ajout d'un bouton d'import de mod local.
- Ajout d'un bouton pour ouvrir directement le dossier Mods.
- Les modifications du dossier Mods sont bloquées lorsque PokeMMO est ouvert.
- Ajout de six mods ALYA embarqués et installables hors ligne, avec vérification SHA-256 avant copie.
- Ajout d'un fond dédié à la bibliothèque Mods.
- Refonte des boutons de l'en-tête Mods pour respecter la direction artistique ALYA.

### 🌐 Nouveaux onglets Web

- Ajout de Poképédia et Pokébip dans des WebViews Tauri intégrées.
- Correction du cycle de création et d'affichage des WebViews enfants.
- Correction des redirections internes afin que les pages puissent naviguer sans être renvoyées continuellement à leur URL initiale.
- Ajout d'un User-Agent compatible WebView2 pour améliorer la compatibilité des sites.
- Ajout des contrôles de rechargement et du système de fond personnalisable.

### 📺 Nouvel onglet Stream configurable

- Ajout d'un onglet Stream basé sur une URL configurable dans `src/config/stream.ts`.
- L'URL peut être changée sans modifier le backend Rust.
- Ajout des boutons Recharger et Ouvrir dans le navigateur.
- Ajout d'une mini-fenêtre WebView séparée, redimensionnable et toujours au premier plan.
- Refonte de la page Stream afin que la WebView utilise toute la largeur et toute la hauteur disponibles.
- Validation des URL HTTP/HTTPS côté backend.

### 🗂️ Sidebar par catégories

- Réorganisation de la sidebar pour mieux supporter le nombre croissant de modules.
- Dashboard reste accessible séparément en haut.
- Catégorie `Web` : Shinyboard, Forum, Vanity, Poképédia, Pokébip, Stream.
- Catégorie `Utilities` : Mods, Surf Manager, AlyArchetype, Rotations, Raids.
- Catégorie `Make Big Money` : Gym Rerun, Baies.
- Catégorie `Shiny-Wars` : Shiny-War.
- Les catégories peuvent être ouvertes ou repliées et leur état est mémorisé localement.
- L'ouverture d'un module depuis le Dashboard ouvre automatiquement sa catégorie.
- Ajout d'une personnalisation de l'ordre vertical des catégories par glisser-déposer ou flèches.
- Dashboard reste verrouillé tout en haut.
- Les réglages de visibilité et les modules Dashboard existants restent compatibles.

### 🎨 Interface et fonds

- Ajout de nouveaux fonds dédiés pour Baies, Raids et Mods.
- Correction de plusieurs problèmes de répétition, largeur maximale et cadrage des backgrounds.
- Harmonisation de plusieurs contrôles avec la direction artistique sombre et dorée d'ALYA.
- Amélioration générale de la lisibilité sur les nouveaux modules.

### 🔧 Stabilité et publication

- Conservation des correctifs d'authentification, Supabase, CSP, updater et avatars Discord des RC précédentes.
- Conservation du système de notifications Tauri ajouté pour les cultures.
- Conservation des systèmes de rôles, badges image, événements Dashboard et WebViews intégrées.
- Nettoyage des anciens overlays et backups de développement avant publication.
- Préparation d'une nouvelle release `1.0.0-rc.11` afin de ne pas réutiliser la version RC10 déjà publiée.

## [1.0.0-rc.10] - 2026-10-27

RC10 est une mise à jour majeure d'**ALYA Companion** centrée sur l'identité visuelle, les profils joueurs et l'arrivée du nouveau module **Gym Rerun**.

### 🏋️ Gym Rerun

- Ajout d'un nouvel onglet natif **Gym Rerun** dans la sidebar.
- Ajout de six stratégies :
  - 6 Pillars
  - 7 Hells
  - Double Typhlosion
  - Prehistoric 5
  - Starry Dance
  - Tempest Explosion
- Chaque stratégie possède une vue détaillée de l'équipe avec les Pokémon nécessaires, leurs rôles, objets, talents, natures, IV, EV et attaques.
- Localisation française des informations de combat et des routes afin de rendre les guides directement exploitables depuis ALYA Companion.
- Ajout d'un mode **Path** distinct de la fiche d'équipe.
- Les routes sont présentées sous forme de timeline/checklist avec :
  - ordre des arènes ;
  - lead à utiliser ;
  - attaques recommandées ;
  - variantes selon les Pokémon adverses ;
  - points de soin ;
  - changements d'objets.
- Ajout de filtres de route par région.
- La progression du Path est sauvegardée localement entre les sessions.
- Refonte complète de la présentation afin de conserver une interface propre à ALYA Companion et de ne pas intégrer le site communautaire source.
- Amélioration générale de la taille des textes et de la lisibilité du module.
- Ajout d'un bénéfice potentiel directement sur les cartes des stratégies.
- Suppression des encarts techniques destinés au développement afin de ne conserver que les informations utiles aux joueurs.

### 🎞️ Illustrations et fonds animés Gym Rerun

- Ajout d'un fond vidéo animé dédié à la page principale Gym Rerun.
- Ajout d'une illustration vidéo dédiée à chacune des six stratégies.
- Lorsqu'une stratégie est ouverte, son illustration devient automatiquement le fond animé de l'onglet.
- Le retour à la liste restaure automatiquement le fond principal Gym Rerun.
- Les cartes utilisent des posters statiques légers au repos.
- Le poster d'une stratégie devient son animation lorsque la souris le survole.
- Les vidéos des six cartes ne tournent jamais toutes simultanément afin de limiter l'utilisation GPU et mémoire.
- Les médias ont été préparés pour une meilleure compatibilité avec WebView2.
- Suppression du grand poster dans la vue détaillée d'une stratégie afin de laisser le fond animé pleinement visible derrière les fiches Pokémon.

### 🏅 Badges joueurs

- Ajout d'un système complet de badges attribuables aux profils Alya.
- Les DEV peuvent créer, supprimer, attribuer et retirer des badges depuis la gestion des utilisateurs.
- Ajout de badges texte / emoji personnalisables avec couleur.
- Ajout de badges basés sur une image.
- Les images de badges sont stockées dans le bucket Supabase public `alya-badges` avec règles RLS dédiées.
- Les badges image apparaissent dans le profil uniquement sous forme d'image, sans texte permanent.
- Le nom du badge est affiché au survol via un tooltip Alya.
- La sidebar affiche les premiers badges du joueur, puis un indicateur `+N` lorsque le profil en possède davantage.
- Ajout d'un ordre manuel des badges par joueur.
- L'ordre choisi est enregistré dans Supabase et utilisé pour déterminer les badges prioritaires affichés dans la sidebar.
- Les modifications sensibles de badges passent par des fonctions PostgreSQL sécurisées réservées aux DEV.
- La mention **ALYA CLOUD** a été retirée du bloc profil afin d'alléger sa présentation.
- Le rôle du joueur et ses badges sont regroupés sous son pseudo.

### 👥 Gestion des joueurs

- Dans **Prépa Alya** et **Gestion utilisateurs DEV**, les joueurs sont désormais regroupés par rôle dans l'ordre :
  1. DEV
  2. Admin
  3. user
- Le tri alphabétique reste appliqué à l'intérieur de chaque groupe de rôle.

### 🖼️ Avatar Discord

- Amélioration de la récupération de l'avatar depuis les métadonnées OAuth Discord.
- Réparation automatique du profil lorsqu'une URL d'avatar Discord peut être reconstruite depuis les données du compte.
- Ajout des domaines CDN Discord nécessaires dans la politique CSP Tauri.
- Ajout d'un fallback visuel si le chargement d'un avatar distant échoue.

### 🌺 Nouvelle identité ALYA

- Remplacement du logo principal de l'application par le nouveau logo ALYA.
- Mise à jour du logo visible dans la sidebar.
- Génération et remplacement du jeu d'icônes Windows / Tauri utilisé par l'exécutable et l'installateur.
- Le nom visible de l'application devient désormais **ALYA Companion**.
- Conservation de l'identifiant technique `alya-companion` afin de ne pas casser les chemins, deep-links et mécanismes existants.

### 🔧 Publication et compatibilité

- Conservation du pipeline GitHub Actions stabilisé dans les RC précédentes.
- Conservation de l'injection sécurisée des variables Supabase lors du build de production.
- Conservation du CSP Supabase HTTPS / WebSocket corrigé en RC9.
- Le workflow de publication utilise le changelog UTF-8 pour générer automatiquement la GitHub Release et l'annonce Discord.
- Le module Gym Rerun embarque plusieurs médias animés ; la taille du paquet Windows est donc supérieure à celle des RC précédentes.

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
