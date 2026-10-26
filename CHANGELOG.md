# Changelog

## [1.0.0-rc.5] - 2026-10-26

Cette RC5 introduit **Alya Cloud**, le nouveau systÃ¨me de comptes dâ€™Alya Companion, ainsi quâ€™une importante Ã©volution de la gestion des utilisateurs, de la sÃ©curitÃ©, de la sidebar et de la personnalisation visuelle.

### â˜ï¸ Alya Cloud

- Ajout dâ€™un systÃ¨me de comptes Alya basÃ© sur **Supabase**.
- Connexion et inscription par email.
- Ajout de la confirmation dâ€™adresse email.
- La confirmation email fonctionne dÃ©sormais aussi depuis un tÃ©lÃ©phone et ne dÃ©pend plus directement du lancement dâ€™Alya via deep-link.
- Ajout de la connexion avec **Discord**.
- Ajout du callback OAuth `alya-companion://auth/callback`.
- IntÃ©gration robuste des deep-links Tauri, y compris lorsque Alya est dÃ©jÃ  ouvert.
- Ajout de la gestion single-instance pour transmettre les callbacks Ã  lâ€™instance Alya existante.
- Ajout dâ€™une carte de profil **ALYA CLOUD** dans la partie basse de la sidebar.
- Affichage du nom de lâ€™utilisateur connectÃ© et de son rÃ´le.

### ðŸ›¡ï¸ RÃ´les et permissions

Ajout des rÃ´les :

- `user`
- `Admin`
- `DEV`

Les rÃ´les sont stockÃ©s dans `public.profiles.role` et protÃ©gÃ©s cÃ´tÃ© Supabase.

Badges :
- `user` : violet
- `Admin` : rouge
- `DEV` : dorÃ©

#### user
- Utilisation normale dâ€™Alya.
- Gestion de sa propre feuille Shiny-War.
- Aucun accÃ¨s aux feuilles Shiny-War des autres utilisateurs.
- Aucun accÃ¨s aux outils Admin/DEV.

#### Admin
- Ajout de **PrÃ©pa Alya**.
- Liste des utilisateurs Alya.
- Consultation en lecture seule de la feuille Shiny-War dâ€™un autre utilisateur.

#### DEV
- AccÃ¨s Ã  PrÃ©pa Alya.
- Ajout du panneau de gestion des utilisateurs.
- Consultation du rÃ´le de chaque utilisateur.
- Attribution sÃ©curisÃ©e des rÃ´les `user`, `Admin` et `DEV`.

Les changements de rÃ´le passent par une fonction PostgreSQL sÃ©curisÃ©e et ne reposent pas uniquement sur le frontend.

### ðŸ” SÃ©curitÃ© et sessions

- Ajout et renforcement des politiques Supabase / RLS.
- Validation cÃ´tÃ© serveur des permissions utilisateur, Admin et DEV.
- Validation rÃ©elle de la session Supabase au dÃ©marrage.
- VÃ©rification de lâ€™existence du compte et du profil associÃ©s Ã  la session.
- Correction des **sessions fantÃ´mes** aprÃ¨s suppression dâ€™un utilisateur Supabase.
- Une session locale invalide ne permet plus dâ€™ouvrir le Dashboard.
- Utilisation de la clÃ© locale dâ€™authentification `alya-companion-auth`.

### ðŸŽ¨ Personnalisation des fonds par onglet

- Ajout dâ€™une icÃ´ne **crayon** dans lâ€™en-tÃªte des onglets principaux, sauf Dashboard.
- SÃ©lecteur visuel permettant dâ€™utiliser les fonds prÃ©sents dans les assets Alya.
- Chaque onglet mÃ©morise son propre fond.
- Persistance des choix aprÃ¨s redÃ©marrage.
- PossibilitÃ© de restaurer le fond par dÃ©faut.
- Le fond animÃ© du Dashboard peut Ãªtre rÃ©utilisÃ© sur les autres onglets.
- Gestion spÃ©cifique des WebViews Vanity, Shinyboard et Forum pendant lâ€™ouverture du sÃ©lecteur.

Onglets personnalisables :
- AlyArchetype
- Surf Manager
- Shiny-War
- Shinyboard
- Rotations
- Forum
- Vanity

### ðŸ§­ Sidebar

- Refonte de la structure de la sidebar en trois zones : header, navigation scrollable et footer fixe.
- Le logo Alya reste fixe en haut.
- Seule la liste des onglets dÃ©file.
- Le bloc infÃ©rieur reste fixe.
- Settings nâ€™est plus un onglet principal.
- Ajout dâ€™une rangÃ©e dâ€™outils fixe dans le footer.
- Pour un DEV : Personnalisation, Settings, PrÃ©pa Alya et Gestion utilisateurs tiennent sur une seule ligne.
- PrÃ©pa Alya et Gestion DEV ne sont jamais affichÃ©s dans la navigation principale.
- Conservation du bouton externe de collapse.

### â†•ï¸ Scrollbar et fondu

- Scrollbar affinÃ©e et harmonisÃ©e avec la couleur dâ€™accentuation Alya.
- Track transparent.
- Suppression du fond noir derriÃ¨re la scrollbar.
- Ajout/conservation du glow nÃ©on.
- Correction de la hauteur et du positionnement vertical de la zone scrollable.
- RÃ©duction de la zone de fondu Ã  environ la hauteur dâ€™un onglet.
- Les onglets restent visibles plus longtemps et disparaissent juste avant le footer.
- La largeur du fondu correspond dÃ©sormais Ã  lâ€™encart dâ€™un onglet actif, avec environ 1 px de dÃ©bord.
- La zone de scrollbar est exclue du masque de fondu.
- La scrollbar peut donc descendre sous la zone de disparition sans Ãªtre masquÃ©e.
- Comportement adaptÃ© Ã©galement en sidebar collapsed.

### ðŸ› Corrections

- Correction de la connexion Discord via deep-link.
- Correction des callbacks OAuth reÃ§us lorsque le frontend nâ€™est pas encore prÃªt.
- Correction du retour dâ€™authentification lorsque Alya est dÃ©jÃ  ouvert.
- Correction de la confirmation email depuis mobile.
- Correction des sessions Supabase locales invalides.
- Correction de lâ€™accÃ¨s au Dashboard aprÃ¨s suppression dâ€™un utilisateur.
- Correction de plusieurs problÃ¨mes de sidebar Ã  faible hauteur de fenÃªtre.
- Correction du footer pouvant Ãªtre recouvert par les onglets.
- Correction dâ€™onglets restant visibles derriÃ¨re le footer.
- Correction du fond noir de la scrollbar.
- Correction de la scrollbar impactÃ©e par le masque de disparition.
- Correction de lâ€™alignement des quatre outils DEV.

### ðŸ”§ Technique

- Ajout de `tauri-plugin-deep-link`.
- Ajout de `tauri-plugin-opener`.
- Ajout de `tauri-plugin-single-instance`.
- Activation de la feature `deep-link` de `tauri-plugin-single-instance`.
- IntÃ©gration de Supabase Auth, Database et des profils Alya.
- Mise en place des politiques RLS nÃ©cessaires aux permissions Alya Cloud.
- Mise en place dâ€™une fonction PostgreSQL sÃ©curisÃ©e pour les changements de rÃ´le.
- AmÃ©lioration de la gestion des WebViews natives lors de lâ€™ouverture dâ€™overlays.
- Persistance locale des fonds personnalisÃ©s par onglet.

## [1.0.0-rc.4] - 2026-10-25

### AjoutÃ©

- Nouvel onglet **Shinyboard**, intÃ©grÃ© directement dans Alya Companion.
- Nouvel onglet **Rotations** pour suivre les lÃ©gendaires fuyards de Kanto et Johto.
- Affichage de la rotation actuelle, de la prochaine rotation et de la rotation suivante en cache.
- Compte Ã  rebours jusqu'au prochain reset mensuel des lÃ©gendaires.
- Bouton **âœ¨ Shiny** dans l'onglet Rotations permettant de basculer tous les sprites animÃ©s entre leur version normale et shiny.
- Nouvel onglet **Forum** intÃ©grant le forum officiel PokeMMO.
- Nouveau panneau de personnalisation accessible depuis l'icÃ´ne clÃ© Ã  molette.
- PossibilitÃ© d'afficher ou masquer les onglets de la barre latÃ©rale.
- PossibilitÃ© de rÃ©organiser librement les onglets avec glisser-dÃ©poser ou boutons haut/bas.
- PossibilitÃ© de modifier la couleur d'accentuation de l'application.
- Nouveau bouton crayon sur le Dashboard permettant de choisir les modules affichÃ©s.
- Nouveau logo Alya Companion utilisÃ© dans l'interface et les diffÃ©rents Ã©lÃ©ments visuels.
- Nouveau systÃ¨me de mise Ã  jour signÃ© basÃ© sur l'updater officiel Tauri.
- Nouveau systÃ¨me de changelog utilisÃ© automatiquement par les GitHub Releases et les annonces Discord.

### Surf Manager

- Ajout du patch **Demanta**.
- Ajout du patch **Lugia Shiny**.
- Ajout du patch **Lugia**.
- Ajout du patch **Latias Shiny**.
- Conservation des patchs **Togekiss Shiny**, **Kyogre Shiny** et **Primal Kyogre Shiny**.
- Ajout de previews visuelles pour les PokÃ©mon disponibles dans le Surf Manager.
- Previews recadrÃ©es et centrÃ©es pour un meilleur rendu dans les cartes.
- Les futurs patchs dÃ©pourvus de preview utilisent automatiquement l'icÃ´ne Surf par dÃ©faut.

### AmÃ©liorÃ©

- Le Dashboard est dÃ©sormais personnalisable.
- L'ordre des onglets est sauvegardÃ© entre les sessions.
- Les modules affichÃ©s sur le Dashboard sont sauvegardÃ©s entre les sessions.
- La couleur d'accentuation personnalisÃ©e est conservÃ©e aprÃ¨s redÃ©marrage.
- Les anciens fichiers de configuration restent compatibles avec les nouveaux paramÃ¨tres.
- L'encart principal du Dashboard a Ã©tÃ© rendu plus compact.
- AmÃ©lioration de la prÃ©sentation des cartes du Surf Manager.
- AmÃ©lioration de la fiabilitÃ© de la rÃ©organisation des onglets sous Windows/WebView2.
- Les rotations lÃ©gendaires sont calculÃ©es localement sans dÃ©pendre d'une API externe.
- Le reset des rotations utilise l'heure UTC afin de rester correct malgrÃ© les changements d'heure.
- Les futures mises Ã  jour Windows pourront Ãªtre installÃ©es par-dessus la version existante sans dÃ©sinstallation manuelle.
- Les mises Ã  jour Alya Companion sont dÃ©sormais vÃ©rifiÃ©es par signature cryptographique avant installation.
- Les GitHub Releases utilisent automatiquement le changelog correspondant Ã  la version publiÃ©e.
- Les annonces Discord incluent automatiquement le changelog de la nouvelle version.

### CorrigÃ©

- Correction de la persistance des nouveaux paramÃ¨tres de personnalisation.
- Correction du systÃ¨me de rÃ©organisation des onglets dans Tauri/WebView2.
- Correction du centrage des previews PokÃ©mon dans le Surf Manager.
- Correction de plusieurs problÃ¨mes de configuration liÃ©s Ã  l'intÃ©gration du nouvel updater Tauri.
- Correction de la compatibilitÃ© entre les nouveaux paramÃ¨tres frontend et leur sauvegarde cÃ´tÃ© Rust.