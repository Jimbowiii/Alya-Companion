## [1.0.0-rc.4] - 2026-10-25

### Ajouté

- Nouvel onglet **Shinyboard**, intégré directement dans Alya Companion.
- Nouvel onglet **Rotations** pour suivre les légendaires fuyards de Kanto et Johto.
- Affichage de la rotation actuelle, de la prochaine rotation et de la rotation suivante en cache.
- Compte à rebours jusqu'au prochain reset mensuel des légendaires.
- Bouton **✨ Shiny** dans l'onglet Rotations permettant de basculer tous les sprites animés entre leur version normale et shiny.
- Nouvel onglet **Forum** intégrant le forum officiel PokeMMO.
- Nouveau panneau de personnalisation accessible depuis l'icône clé à molette.
- Possibilité d'afficher ou masquer les onglets de la barre latérale.
- Possibilité de réorganiser librement les onglets avec glisser-déposer ou boutons haut/bas.
- Possibilité de modifier la couleur d'accentuation de l'application.
- Nouveau bouton crayon sur le Dashboard permettant de choisir les modules affichés.
- Nouveau logo Alya Companion utilisé dans l'interface et les différents éléments visuels.
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
- Les futurs patchs dépourvus de preview utilisent automatiquement l'icône Surf par défaut.

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
- Les futures mises à jour Windows pourront être installées par-dessus la version existante sans désinstallation manuelle.
- Les mises à jour Alya Companion sont désormais vérifiées par signature cryptographique avant installation.
- Les GitHub Releases utilisent automatiquement le changelog correspondant à la version publiée.
- Les annonces Discord incluent automatiquement le changelog de la nouvelle version.

### Corrigé

- Correction de la persistance des nouveaux paramètres de personnalisation.
- Correction du système de réorganisation des onglets dans Tauri/WebView2.
- Correction du centrage des previews Pokémon dans le Surf Manager.
- Correction de plusieurs problèmes de configuration liés à l'intégration du nouvel updater Tauri.
- Correction de la compatibilité entre les nouveaux paramètres frontend et leur sauvegarde côté Rust.