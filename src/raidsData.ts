export type RaidPokemonBuild = {
  name: string;
  spriteId: number;
  ability?: string;
  item: string;
  nature: string;
  ivs: string;
  evs: string;
  moves: string[];
  note?: string;
};

export type RaidPlayer = {
  label: string;
  role: string;
  team: RaidPokemonBuild[];
};

export type RaidTurn = {
  turn: number;
  actions: [string, string, string, string];
};

export type RaidGuide = {
  id: string;
  boss: string;
  bossId: number;
  stars: number;
  types: string[];
  region: string;
  location: string;
  accent: string;
  summary: string;
  players: RaidPlayer[];
  turns: RaidTurn[];
  warnings: string[];
  mechanics?: string[];
};

const p = (
  name: string,
  spriteId: number,
  item: string,
  nature: string,
  ivs: string,
  evs: string,
  moves: string[],
  ability?: string,
  note?: string,
): RaidPokemonBuild => ({ name, spriteId, item, nature, ivs, evs, moves, ability, note });

export const RAIDS: RaidGuide[] = [
  {
    id: "heatran",
    boss: "Heatran",
    bossId: 485,
    stars: 6,
    types: ["Feu", "Acier"],
    region: "Sinnoh",
    location: "Mont Abrupt",
    accent: "#ff7a45",
    summary: "Pluie, contrôle du terrain et pression spéciale autour d’Octillery.",
    warnings: [
      "Le scénario avec Maganon doit rester favorable ; sinon, recommencer est plus sûr.",
      "Surveille la météo : si le soleil remplace la pluie, Tarpaud doit la remettre dès que possible.",
      "Vers 30 % de PV, Croco Larme de Voltali devient une fenêtre importante de la stratégie.",
    ],
    mechanics: [
      "100 % : Magmapool pose un danger de terrain important.",
      "80 % : Piège de Roc rejoint le terrain.",
      "67 % : Hurlement — Ventouse et Miroir Magik sécurisent cette phase.",
      "50 % : Mur de Fer augmente fortement la Défense du boss.",
      "40 % : Heatran s’adapte au type d’attaque qui l’a le plus touché.",
      "25 % : barrière à 4 charges.",
    ],
    players: [
      {
        label: "Joueur 1",
        role: "Contrôle & soutien",
        team: [
          p("Minotaupe", 530, "Bandeau Choix", "Rigide / Solo / Mauvais / Jovial / Pressé / Naïf", "31 Atk / 31 Vit", "252 Atk / 252 Vit", ["Séisme"]),
          p("Nidoking", 34, "Orbe Vie", "Modeste / Mauvais / Doux", "31 SpA / 31 Vit", "252 SpA / 252 Vit", ["Telluriforce"], "Sans Limite"),
          p("Octillery", 224, "Lunettes Choix", "Modeste / Mauvais / Doux", "31 SpA / 11+ Vit", "252 SpA / 200 Vit", ["Hydrocanon", "Giclédo"], "Ventouse"),
          p("Staross", 121, "Lumargile", "Modeste / Mauvais / Doux", "25+ Vit", "252 SpA / 252 SpD", ["Mur Lumière", "Hydrocanon"]),
          p("Hyporoi", 230, "Eau Mystique / Plaque Hydro", "Modeste", "31 SpA / 31 Vit / 25+ PV, SpD, Def", "252 SpA / 64 SpD / 192 Vit", ["Hydrocanon", "Saumure", "Danse Pluie"], "Glissade"),
          p("Voltali", 135, "Non précisé", "Non précisée", "Non précisés", "Non précisés", ["Croco Larme"], undefined, "À utiliser idéalement autour de 30 % des PV du boss."),
        ],
      },
      {
        label: "Joueur 2",
        role: "Dégâts & pluie",
        team: [
          p("Minotaupe", 530, "Bandeau Choix", "Rigide", "31 Atk / 31 Vit", "252 Atk / 252 Vit", ["Séisme"]),
          p("Scorvol", 472, "Joyau Sol / Bandeau Choix", "Mauvais", "31 Atk / 10+ Vit, PV, SpD", "252 Atk / 252 Vit", ["Piétisol", "Séisme"]),
          p("Octillery", 224, "Lunettes Choix", "Modeste", "31 SpA / 11+ Vit", "252 SpA / 200 Vit", ["Hydrocanon", "Giclédo"], "Ventouse"),
          p("Békipan", 279, "Mouchoir Choix", "Sans baisse utile", "31 SpA / 31 Vit", "252 SpA / 252 Vit", ["Ball’Météo", "Tourniquet"], "Crachin"),
          p("Tarpaud", 186, "Joyau Eau", "Timide", "31 SpA / 31 Vit / 25+ PV, SpD", "252 SpA / 252 Vit", ["Ball’Météo", "Hydrocanon"], "Crachin"),
          p("Hyporoi", 230, "Équipement d’assaut", "Modeste", "31 SpA / 31 Vit / 25+ PV, SpD, Def", "252 SpA / 252 SpD", ["Hydrocanon", "Saumure"], "Glissade"),
        ],
      },
      {
        label: "Joueur 3",
        role: "Support & contrôle",
        team: [
          p("Dimoret", 461, "Pic Venin", "Rigide / Solo", "31 Atk / 0+ Vit", "252 Atk / 252 Vit", ["Larcin"]),
          p("Nidoking", 34, "Orbe Vie", "Modeste / Mauvais / Doux", "31 SpA / 31 Vit", "252 SpA / 252 Vit", ["Telluriforce"], "Sans Limite"),
          p("Xatu", 178, "Lumargile", "Sans baisse de Vitesse", "2+ Vit", "252 Vit", ["Anti-Brume", "Mur Lumière"], "Miroir Magik"),
          p("Libégon", 330, "Lunettes Choix", "Modeste", "31 SpA / 31 Vit / 20+ PV, SpD", "252 SpA / 100 Vit / 152 SpD", ["Telluriforce"]),
          p("Tarpaud", 186, "Joyau Eau", "Timide", "31 SpA / 31 Vit / 25+ PV, SpD", "252 SpA / 252 Vit", ["Ball’Météo", "Hydrocanon"], "Crachin"),
          p("Hyporoi", 230, "Équipement d’assaut", "Modeste", "31 SpA / 31 Vit / 25+ PV, SpD, Def", "252 SpA / 252 SpD", ["Hydrocanon", "Saumure"], "Glissade"),
        ],
      },
      {
        label: "Joueur 4",
        role: "Utilitaire & soutien",
        team: [
          p("Minotaupe", 530, "Bandeau Choix", "Rigide", "31 Atk / 31 Vit", "252 Atk / 252 Vit", ["Tunnelier"]),
          p("Nidoking", 34, "Orbe Vie", "Modeste / Mauvais / Doux", "31 SpA / 31 Vit", "252 SpA / 252 Vit", ["Telluriforce"], "Sans Limite"),
          p("Békipan", 279, "Mouchoir Choix", "Sans baisse utile", "31 SpA / 31 Vit", "252 SpA / 252 Vit", ["Anti-Brume"], "Crachin"),
          p("Libégon", 330, "Lunettes Choix", "Modeste", "31 SpA / 31 Vit / 20+ PV, SpD", "252 SpA / 100 Vit / 152 SpD", ["Telluriforce"]),
          p("Tarpaud", 186, "Joyau Eau", "Timide", "31 SpA / 31 Vit / 25+ PV, SpD", "252 SpA / 252 Vit", ["Ball’Météo", "Hydrocanon"], "Crachin"),
          p("Hyporoi", 230, "Équipement d’assaut", "Modeste", "31 SpA / 31 Vit / 25+ PV, SpD, Def", "252 SpA / 252 SpD", ["Hydrocanon", "Saumure"], "Glissade"),
        ],
      },
    ],
    turns: [
      { turn: 1, actions: ["Minotaupe — Séisme", "Minotaupe — Séisme", "Dimoret — Larcin", "Minotaupe — Tunnelier"] },
      { turn: 2, actions: ["Nidoking — Telluriforce", "Scorvol — Piétisol", "Nidoking — Telluriforce", "Nidoking — Telluriforce"] },
      { turn: 3, actions: ["Octillery — Hydrocanon", "Octillery — Hydrocanon", "Xatu — Anti-Brume", "Békipan — Anti-Brume"] },
      { turn: 4, actions: ["Staross — Mur Lumière", "Békipan — Tourniquet", "Libégon — Telluriforce", "Libégon — Telluriforce"] },
      { turn: 5, actions: ["Hyporoi — Hydrocanon / Saumure", "Tarpaud — Ball’Météo / Hydrocanon", "Tarpaud — Ball’Météo / Hydrocanon", "Tarpaud — Ball’Météo / Hydrocanon"] },
      { turn: 6, actions: ["Voltali — Croco Larme (~30 %)", "Hyporoi — Hydrocanon / Saumure", "Hyporoi — Hydrocanon / Saumure", "Hyporoi — Hydrocanon / Saumure"] },
    ],
  },
  {
    id: "cresselia",
    boss: "Cresselia",
    bossId: 488,
    stars: 6,
    types: ["Psy"],
    region: "Sinnoh",
    location: "Île Pleine Lune",
    accent: "#d79cff",
    summary: "Débuffs, barrières et dégâts Ténèbres/Spectre avec une exécution très cadrée.",
    warnings: [
      "Tour 1 : si Hippodocus tombe sur un coup critique, recommencer.",
      "Tour 3 : si Cresselia obtient un bonus d’Attaque Spéciale, recommencer.",
    ],
    players: [
      { label: "Joueur 1", role: "Sable & soutien", team: [
        p("Hippodocus", 450, "Herbe Blanche", "Neutre / Assuré / Modeste / Timide / Malin / Jovial", "31 PV / 31 SpD / 27+ Vit", "166 Def / 92 SpD / 252 Vit", ["Séduction"], "Sable Volant"),
        p("Farfaduvet", 547, "Lumargile", "Libre", "Sans importance", "6 PV / 252 SpA / 252 Vit", ["Mur Lumière"], "Farceur"),
        p("Fermite", 632, "Bandeau Choix", "Rigide / Solo / Brave", "27+ PV / 11+ Atk / 27+ SpD", "124 PV / 252 Atk / 90 SpA / 44 SpD", ["Plaie-Croix"], "Essaim"),
        p("Gueriaigle", 628, "Baie Rowap", "Rigide / Solo", "5+ PV / 21+ Atk / 5+ SpD / 2+ Vit", "6 PV / 252 Atk / 252 Vit", ["Assurance"], "Acharné"),
        p("Milobellus", 350, "Cape Furtive", "Discret", "31 PV / 31 SpA / 31 SpD / 8- Vit", "6 PV / 252 SpA / 252 SpD", ["Lance-Boue", "Rune Protect", "Saumure"], "Battant"),
        p("Pingoléon", 395, "Restes", "Modeste / Doux / Discret", "31 PV / 31 SpA / 31 SpD", "252 PV / 6 Atk / 252 SpA", ["Brume", "Atterrissage", "Saumure"], "Battant"),
      ]},
      { label: "Joueur 2", role: "Dégâts physiques", team: [
        p("Dimoret", 461, "Pic Venin", "Rigide / Solo", "2+ PV / 31 Atk / 2+ SpD", "6 PV / 252 Atk / 252 Vit", ["Dégommage"]),
        p("Scalproie", 625, "Orbe Vie", "Rigide / Solo / Brave", "17+ Atk / 31 SpD", "6 PV / 252 Atk / 252 SpD", ["Coup Bas"], "Acharné"),
        p("Sharpedo", 319, "Bandeau Choix", "Rigide / Solo / Mauvais", "31 Atk / 13+ Vit", "252 Atk / 6 Def / 252 Vit", ["Assurance"]),
        p("Gueriaigle", 628, "Veste de Combat", "Rigide / Solo", "21+ Atk / 3+ Vit", "6 PV / 252 Atk / 252 SpD", ["Assurance"], "Acharné"),
        p("Milobellus", 350, "Cape Furtive", "Modeste / Doux", "31 PV / 31 SpA / 31 SpD", "6 PV / 252 SpA / 252 SpD", ["Saumure"], "Battant"),
        p("Pingoléon", 395, "Lunettes Choix", "Modeste / Doux", "31 SpA / 31 SpD / 31 Vit", "252 SpA / 236 SpD / 20 Vit", ["Saumure"], "Battant"),
      ]},
      { label: "Joueur 3", role: "Contrôle spécial", team: [
        p("Chapignon", 286, "Mouchoir Choix", "Sans baisse de Vitesse", "Sans importance", "206 Atk / 52 SpD / 252 Vit", ["Rune Protect"]),
        p("Scalproie", 625, "Bandeau Choix", "Rigide / Solo / Brave", "31 SpD", "252 PV / 168 Atk / 88 SpD", ["Coup Bas"], "Acharné"),
        p("Nostenfer", 169, "Aucun", "SpD neutre", "8+ PV / 8+ SpD", "100 PV / 58 Atk / 100 SpD / 252 Vit", ["Bombe Acide"]),
        p("Sidérella", 576, "Lunettes Choix", "Modeste / Doux", "29+ PV / 29+ SpD / 31 SpA", "6 PV / 252 SpA / 252 SpD", ["Ball’Ombre"], "Battant"),
        p("Colhomard", 342, "Pic Venin", "Rigide / Solo / Brave", "20+ PV / 31 Atk / 20+ SpD", "252 Atk / 252 SpD", ["Dégommage"], "Adaptabilité"),
        p("Tyranocif", 248, "Balle Fer", "Rigide / Solo", "31 Atk / 31 SpD / 31 Vit", "124 PV / 252 Atk / 132 SpD", ["Séduction", "Assurance", "Gros’Yeux"], "Sable Volant"),
      ]},
      { label: "Joueur 4", role: "Support & Spectre", team: [
        p("Xatu", 178, "Mouchoir Choix", "SpD neutre", "3+ PV / 3+ SpD", "184 PV / 74 Atk / 252 Vit", ["Air Veinard"]),
        p("Scalproie", 625, "Orbe Vie", "Rigide / Solo / Brave", "17+ Atk / 31 SpD", "6 PV / 252 Atk / 252 SpD", ["Coup Bas"], "Acharné"),
        p("Ectoplasma", 94, "Joyau Spectre", "Modeste / Doux", "31 SpA / 31 Vit", "100 PV / 252 SpA / 100 SpD / 56 Vit", ["Châtiment"]),
        p("Sidérella", 576, "Lunettes Choix", "Modeste / Doux / Foufou", "31 SpA", "6 PV / 252 SpA / 252 Vit", ["Ball’Ombre"], "Battant"),
        p("Lippoutou", 124, "Baie Rowap", "SpD neutre", "Sans importance", "6 PV / 252 Atk / 252 SpA", ["Air Veinard"]),
        p("Crocorible", 553, "Bandeau Choix", "Rigide / Solo", "31 PV / 31 Atk / 31 SpD", "6 PV / 252 Atk / 252 SpD", ["Assurance"]),
      ]},
    ],
    turns: [
      { turn: 1, actions: ["Séduction", "Dégommage", "Rune Protect", "Air Veinard"] },
      { turn: 2, actions: ["Hippodocus tombe", "Coup Bas", "Coup Bas", "Coup Bas"] },
      { turn: 3, actions: ["Mur Lumière", "Coup Bas", "Coup Bas", "Coup Bas"] },
      { turn: 4, actions: ["Boutefeu", "Assurance", "Bombe Acide", "Châtiment"] },
      { turn: 5, actions: ["Assurance", "Assurance", "Ball’Ombre", "Ball’Ombre"] },
      { turn: 6, actions: ["Rune Protect", "Saumure", "Dégommage", "Air Veinard"] },
      { turn: 7, actions: ["Lance-Boue", "Saumure", "Séduction", "Assurance"] },
      { turn: 8, actions: ["Saumure", "Saumure", "Assurance", "Assurance"] },
      { turn: 9, actions: ["Brume", "Saumure", "Séduction", "Assurance"] },
      { turn: 10, actions: ["Atterrissage", "Saumure", "Gros’Yeux", "Assurance"] },
      { turn: 11, actions: ["Saumure", "Saumure", "Assurance", "Assurance"] },
    ],
  },
  {
    id: "meloetta",
    boss: "Meloetta",
    bossId: 648,
    stars: 5,
    types: ["Normal", "Psy"],
    region: "Unys",
    location: "Rotombourg",
    accent: "#68d6c9",
    summary: "Coordination stricte sur douze tours avec gestion de vitesse, Distorsion et dégâts alternés.",
    warnings: [
      "Tour 1 : si Crocorible tombe ou si Mentali est ciblé, recommencer.",
      "Tour 2 : si Meloetta obtient un bonus d’Attaque Spéciale, recommencer.",
      "Tour 5 : l’ordre de vitesse autour de Colhomard et Lançargot est essentiel.",
      "Tours 10–11 : vérifier la vitesse et la dernière attaque avant Exploforce / Psyko.",
    ],
    players: [
      { label: "Joueur 1", role: "Contrôle & Distorsion", team: [
        p("Cresselia", 488, "Bandeau Choix", "Calme", "31 PV / 31 SpD / 31 Vit", "116 PV / 252 SpD / 116 Vit", ["Tourmagik"]),
        p("Scarhino", 214, "Orbe Vie", "Rigide", "31 Atk / 31 Vit", "252 Atk / 252 Vit", ["Mégacorne"], "Essaim", "Vitesse finale visée : 280."),
        p("Suicune", 245, "Cape Furtive", "Naïf", "0 SpD", "140 PV / 204 Vit", ["Après Vous", "Aboiement"], "Pression"),
        p("Colhomard", 342, "Balle Fer", "Brave", "31 Atk / 20- Vit", "252 Atk / 0 Vit", ["Dégommage"], "Adaptabilité"),
        p("Téraclope", 356, "Orbe Flamme", "Libre", "31 Atk", "252 Atk", ["Dégommage"], "Pression"),
        p("Flagadoss", 80, "Casque Brut", "Relax", "31 PV / 31 Def / 31 SpA / 20+ SpD / 0 Vit", "252 PV / 252 Def / 0 Vit", ["Boost", "Ébullition", "Exploforce"], "Benêt"),
      ]},
      { label: "Joueur 2", role: "Insecte & pression", team: [
        p("Tranchodon", 612, "Pic Venin", "Rigide", "20+ PV / 31 Atk / 20+ SpD / 31 Vit", "252 Atk / 56 SpD / 200 Vit", ["Dégommage"], "Rivalité"),
        p("Brutapode", 545, "Bandeau Choix", "Rigide", "20+ PV / 31 Atk / 20+ SpD / 31 Vit", "252 Atk / 160 SpD / 96 Vit", ["Mégacorne"], "Point Poison"),
        p("Kabutops", 141, "Baie Sailak", "Jovial", "31 PV / 31 Vit", "252 PV / 252 Vit", ["Strido-Son"], "Glissade"),
        p("Lançargot", 589, "Ceinture Force", "Brave", "31 Atk / 5 Vit", "252 Atk / 200 SpD / 40 Vit", ["Mégacorne", "Piqûre"], "Essaim"),
        p("Flagadoss", 80, "Casque Brut", "Relax", "31 PV / 31 Def / 31 SpA / 20+ SpD / 0 Vit", "236 PV / 252 Def / 20 Vit", ["Boost", "Psyko", "Mur de Fer", "Paresse"], "Tempo Perso"),
        p("Mushana", 518, "Baie Jaboca", "Relax", "31 PV / 31 Def / 20+ SpD", "252 PV / 252 Def", ["Air Veinard", "Abri", "Charme", "Psyko"], "Prédiction"),
      ]},
      { label: "Joueur 3", role: "Vitesse & support", team: [
        p("Mentali", 196, "Baie Lingan", "Modeste", "31 PV / 31 SpD / 31 Vit", "56 PV / 252 SpD / 88 Vit", ["Gravité", "Tourmagik"], "Synchro"),
        p("Entei", 244, "Baie Sailak", "Timide", "10 SpD", "252 SpA / 76 Vit", ["Aboiement"], "Pression"),
        p("Corboss", 430, "Bandeau Choix", "Rigide", "31 Atk", "252 Atk / 252 Vit", ["Assurance"], "Impudence"),
        p("Lançargot", 589, "Ceinture Force", "Rigide", "Non précisés", "252 Atk / 252 Vit", ["Mégacorne", "Piqûre"], "Essaim"),
        p("Symbios", 579, "Lumargile", "Relax", "31 PV / 31 Def / 20+ SpD", "252 PV / 252 Def", ["Abri", "Gravité", "Rune Protect"], "Envelocape"),
        p("Flagadoss", 80, "Casque Brut", "Relax", "31 PV / 31 Def / 31 SpA / 20+ SpD / 0 Vit", "244 PV / 252 Def / 12 Vit", ["Boost", "Distorsion", "Exploforce"], "Tempo Perso"),
      ]},
      { label: "Joueur 4", role: "Ténèbres & contrôle", team: [
        p("Crocorible", 553, "Joyau Ténèbres", "Rigide", "25+ PV / 31 Atk / 25+ SpD / 31 Vit", "252 Atk / 252 Vit", ["Assurance", "Abri"], "Intimidation"),
        p("Pyrax", 637, "Lunettes Choix", "Modeste", "31 SpA / 20+ SpD / 31 Vit", "252 SpA / 76 SpD / 180 Vit", ["Bourdon"], "Corps Ardent"),
        p("Colhomard", 342, "Balle Fer", "Brave", "31 Atk / 20- Vit", "252 Atk / 0 Vit", ["Dégommage"], "Adaptabilité"),
        p("Mushana", 518, "Cape Furtive", "Relax", "31 PV / 31 Def / 20+ SpD", "252 PV / 252 Def", ["Gravité", "Rune Protect"], "Prédiction"),
        p("Symbios", 579, "Casque Brut", "Relax", "Non précisés", "252 PV / 252 Def", ["Charme"], "Envelocape"),
        p("Flagadoss", 80, "Baie Jaboca", "Relax", "31 PV / 31 Def / 31 SpA / 20+ SpD / 0 Vit", "252 PV / 252 Def / 4 Vit", ["Exploforce", "Paresse"], "Tempo Perso"),
      ]},
    ],
    turns: [
      { turn: 1, actions: ["Tourmagik (Éoko)", "Dégommage", "Gravité", "Abri"] },
      { turn: 2, actions: ["Mégacorne", "Mégacorne", "Tourmagik (Brouhabam)", "Assurance"] },
      { turn: 3, actions: ["Aboiement", "Strido-Son", "Aboiement", "Bourdon"] },
      { turn: 4, actions: ["À la Queue", "Mégacorne", "Assurance", "Bourdon"] },
      { turn: 5, actions: ["Dégommage", "Piqûre", "Mégacorne", "Dégommage"] },
      { turn: 6, actions: ["Dégommage", "Boost", "Protection", "Air Veinard"] },
      { turn: 7, actions: ["Boost sur J2", "Psyko", "Gravité", "Rune Protect"] },
      { turn: 8, actions: ["Exploforce", "Psyko", "Distorsion", "Charme"] },
      { turn: 9, actions: ["Exploforce", "Mur de Fer", "Boost", "Boost"] },
      { turn: 10, actions: ["Ébullition / Boost", "Paresse", "Exploforce / Psyko", "Exploforce / Psyko"] },
      { turn: 11, actions: ["Exploforce / Psyko", "Air Veinard", "Exploforce / Psyko", "Exploforce / Psyko"] },
      { turn: 12, actions: ["Fin du combat", "Psyko", "Fin du combat", "Exploforce"] },
    ],
  },
  {
    id: "cobaltium",
    boss: "Cobaltium",
    bossId: 638,
    stars: 6,
    types: ["Acier", "Combat"],
    region: "Unys",
    location: "Espace Guide",
    accent: "#7fc7ff",
    summary: "Ouverture en Éruption puis burst Combat spécial sous écrans, Gravité et contrôle de vitesse.",
    warnings: [
      "Tour 1 : si Farfaduvet tombe sur un coup critique, recommencer.",
      "Tour 2 : le Heatran du joueur 3 doit subir des dégâts sans tomber.",
      "Si les dégâts manquent en fin de combat, Exploforce peut remplacer Gravité pour tenter le finish.",
    ],
    players: [
      { label: "Joueur 1", role: "Feu & électrique", team: [
        p("Typhlosion", 157, "Mouchoir Choix", "Modeste", "31 SpA / 31 Def", "148 Def / 252 SpA", ["Éruption"], undefined, "Défense finale visée : 229."),
        p("Heatran", 485, "Casque Brut", "Modeste", "31 SpA / 31 Atk", "252 Def / 252 SpD", ["Éruption"]),
        p("Motisma-Lavage", 479, "Orbe Vie", "Modeste", "31 SpA", "252 SpA / 252 Vit", ["Hydrocanon", "Décharge", "Fatal-Foudre"]),
        p("Pharamp", 181, "Ceinture Pro", "Modeste", "31 SpA", "160 Def / 252 SpA / 92 Vit", ["Exploforce"], "Plus"),
        p("Symbios", 579, "Baie Rowap", "Discret", "31 SpA / 0 Vit", "252 SpA / 252 SpD", ["Exploforce", "Gravité"], "Garde Magik"),
        p("Lucario", 448, "Lunettes Choix", "Modeste", "31 SpA", "252 SpA", ["Exploforce", "Onde Vide", "Aurasphère"]),
      ]},
      { label: "Joueur 2", role: "Support & spécial", team: [
        p("Farfaduvet", 547, "Baie Sitrus", "Calme", "31 PV / 31 Def / 31 SpD", "200 PV / 252 SpA", ["Charme", "Vent Arrière"], "Farceur"),
        p("Heatran", 485, "Casque Brut", "Modeste", "31 SpA / 31 Atk", "252 Def / 252 SpD", ["Éruption"]),
        p("Hypno", 97, "Orbe Flamme", "Calme", "31 PV / 31 Def / 31 SpD", "6 PV / 252 Def / 252 SpD", ["Tourmagik", "Distorsion"], "Attention"),
        p("Pharamp", 181, "Ceinture Pro", "Modeste", "31 SpA", "252 SpA / 252 Vit", ["Exploforce"], "Plus"),
        p("Nidoking", 34, "Joyau Sol", "Modeste", "31 SpA", "252 SpA", ["Telluriforce", "Exploforce"], "Sans Limite"),
        p("Symbios", 579, "Lunettes Choix", "Modeste", "31 SpA", "252 SpA / 252 SpD", ["Exploforce"], "Garde Magik"),
      ]},
      { label: "Joueur 3", role: "Soleil & burst", team: [
        p("Feunard", 38, "Loupe", "Pressé", "20+ Vit", "252 Vit", ["Feu Follet"], "Sécheresse"),
        p("Heatran", 485, "Casque Brut", "Modeste", "31 SpA / 31 Atk", "252 Def / 252 SpD / 178 Vit", ["Éruption", "Lance-Flammes"]),
        p("Nidoking", 34, "Orbe Vie", "Modeste", "31 SpA", "252 SpA / 252 SpD", ["Telluriforce", "Exploforce"], "Sans Limite"),
        p("Lucario", 448, "Joyau Combat", "Modeste", "31 SpA", "252 SpA / 252 Vit", ["Exploforce"]),
        p("Pharamp", 181, "Ceinture Pro", "Modeste", "31 SpA", "120 Atk / 252 SpA / 132 Vit", ["Exploforce"], "Plus"),
        p("Symbios", 579, "Lunettes Choix", "Modeste", "31 SpA", "252 SpA / 252 SpD", ["Exploforce"], "Garde Magik"),
      ]},
      { label: "Joueur 4", role: "Écrans & gravité", team: [
        p("Jirachi", 385, "Lumargile", "Jovial / Timide", "31 Def / 31 Vit", "112 Def / 190 SpD / 208 Vit", ["Gravité", "Mur Lumière", "Protection", "Air Veinard"]),
        p("Cornèbre", 198, "Casque Brut", "Libre", "31 PV / 31 Def", "252 SpA / 178 Vit", ["À la Queue"], "Farceur"),
        p("Pharamp", 181, "Ceinture Pro", "Modeste", "31 SpA", "252 SpA / 252 Vit", ["Exploforce"], "Plus"),
        p("Nidoking", 34, "Joyau Sol", "Modeste", "31 SpA", "252 SpA", ["Telluriforce", "Exploforce"], "Sans Limite"),
        p("Symbios", 579, "Lunettes Choix", "Modeste", "31 SpA", "252 SpA / 252 SpD", ["Exploforce"], "Garde Magik"),
        p("Lucario", 448, "Joyau Combat", "Modeste", "31 SpA", "252 SpA", ["Exploforce", "Onde Vide", "Aurasphère"]),
      ]},
    ],
    turns: [
      { turn: 1, actions: ["Éruption", "Charme", "Feu Follet", "Mur Lumière"] },
      { turn: 2, actions: ["Éruption", "Vent Arrière", "Éruption", "Protection"] },
      { turn: 3, actions: ["Décharge", "Éruption", "Lance-Flammes", "Air Veinard"] },
      { turn: 4, actions: ["Hydrocanon", "Tourmagik", "Telluriforce", "Gravité"] },
      { turn: 5, actions: ["Fatal-Foudre sur l’add", "Distorsion", "Exploforce", "À la Queue"] },
      { turn: 6, actions: ["Exploforce", "Exploforce", "Exploforce", "Exploforce"] },
      { turn: 7, actions: ["Exploforce", "Telluriforce", "Exploforce", "Telluriforce"] },
      { turn: 8, actions: ["Exploforce", "Exploforce", "Exploforce", "Exploforce"] },
      { turn: 9, actions: ["Gravité", "Exploforce", "Exploforce", "Exploforce"] },
      { turn: 10, actions: ["Onde Vide", "Fin du combat", "Fin du combat", "Onde Vide"] },
    ],
  },
  {
    id: "terrakium",
    boss: "Terrakium",
    bossId: 639,
    stars: 5,
    types: ["Roche", "Combat"],
    region: "Unys",
    location: "Route Victoire",
    accent: "#d2a96d",
    summary: "Contrôle de vitesse, pluie et enchaînement Eau / Acier / Plante jusqu’au finish Combat.",
    warnings: [
      "Tour 6 : si À la Queue n’arrive pas après la succession d’attaques indiquée dans le journal de combat, recommencer.",
    ],
    players: [
      { label: "Joueur 1", role: "Ouverture & plante", team: [
        p("Cerfrousse", 234, "Mouchoir Choix", "Libre", "IV proches de 0", "4 Vit", ["Protection"], "Intimidation"),
        p("Clamiral", 503, "Orbe Vie", "Modeste / Doux", "31 PV / 31 Def / 31 SpA", "252 SpA", ["Hydrocanon", "Hydroblast"], "Torrent"),
        p("Tartard", 62, "Casque Brut", "Libre", "Non précisés", "252 SpD", ["Cognobidon"]),
        p("Kaorine", 344, "Lumargile", "Lâche / Malin", "31 PV / Atk / 31 Def / 0 Vit", "136 PV / 116 Atk / 252 Def / 4 Vit", ["Protection", "Tunnelier"], "Lévitation"),
        p("Ténéfix", 302, "Baie Jaboca", "Libre", "+15 PV / +15 Def", "252 PV / 252 Def", ["Chatouille", "À la Queue"], "Farceur"),
        p("Torterra", 389, "Graine Miracle", "Rigide / Mauvais", "+25 PV / 31 Atk / +25 Def", "252 Atk / 252 Def", ["Martobois", "Chatouille", "Garde Large"], "Coque Armure"),
      ]},
      { label: "Joueur 2", role: "Tourmagik & acier", team: [
        p("Cerfrousse", 234, "Orbe Flamme", "Libre", "IV proches de 0", "4 Vit", ["Tourmagik"], "Intimidation"),
        p("Clamiral", 503, "Orbe Vie", "Modeste / Doux", "31 PV / 31 Def / 31 SpA", "252 SpA", ["Hydrocanon", "Hydroblast"], "Torrent"),
        p("Kaorine", 344, "Baie Jaboca", "Lâche / Malin", "31 PV / Atk / 31 Def / 0 Vit", "200 Atk / 252 Def / 12 Vit", ["Boost", "Psykoud’Boul", "Tunnelier"], "Lévitation"),
        p("Noacier", 598, "Bandeau Choix", "Brave", "+25 PV / 31 Atk / +25 Def", "88 PV / 168 Atk / 252 Def", ["Gyroballe"], "Épine de Fer"),
        p("Ténéfix", 302, "Aucun", "Libre", "Non précisés", "0", ["Chatouille", "À la Queue", "Feu Follet"], "Farceur"),
        p("Torterra", 389, "Casque Brut", "Rigide / Mauvais", "+25 PV / 31 Atk / +25 Def", "252 Atk / 252 Def", ["Martobois", "Chatouille", "Garde Large"], "Coque Armure"),
      ]},
      { label: "Joueur 3", role: "Vent arrière & Distorsion", team: [
        p("Cornèbre", 198, "Aucun", "Libre", "Non précisés", "0", ["Vent Arrière"], "Farceur"),
        p("Clamiral", 503, "Orbe Vie", "Modeste / Doux", "31 PV / 31 Def / 31 SpA", "252 SpA", ["Hydrocanon", "Hydroblast"], "Torrent"),
        p("Kaorine", 344, "Baie Jaboca", "Lâche / Malin", "31 PV / Atk / 31 Def / 0 Vit", "248 Atk / 252 Def / 8 Vit", ["Boost", "Distorsion", "Psykoud’Boul", "Tunnelier"], "Lévitation"),
        p("Noacier", 598, "Cape Obscure", "Brave", "+25 PV / 31 Atk / +25 Def", "88 PV / 168 Atk / 252 Def", ["Gyroballe"], "Épine de Fer"),
        p("Charmina", 308, "Ceinture Pro", "Rigide / Solo", "31 Atk", "252 Atk", ["Close Combat"], "Force Pure"),
        p("Carchacrok", 445, "Casque Brut", "Sans baisse de Défense", "Non précisés", "252 PV / 252 Def", ["Coup d’Main"], "Peau Dure"),
      ]},
      { label: "Joueur 4", role: "Support & finish", team: [
        p("Békipan", 279, "Mouchoir Choix", "Libre", "Non précisés", "0", ["Anti-Brume"], "Crachin"),
        p("Jirachi", 385, "Baie Jaboca", "Sans baisse de Défense", "31 PV / 31 Def", "100 Def", ["Air Veinard", "Vœu"], "Sérénité"),
        p("Kaorine", 344, "Cape Obscure", "Lâche / Malin", "31 PV / Atk / 31 Def / 0 Vit", "252 Atk / 152 Def", ["Gravité", "Explosion", "Rune Protect", "Permuforce"], "Lévitation"),
        p("Queulorior", 235, "Aucun", "Libre", "Non précisés", "0", ["Air Veinard"]),
        p("Gallame", 475, "Joyau Combat", "Rigide", "31 Atk", "252 Atk / 252 Def", ["Close Combat", "Distorsion", "Prévention"]),
        p("Bétochef", 534, "Bandeau Choix", "Rigide / Solo", "+20 PV / 31 Atk / +20 Def", "252 PV / 252 Atk", ["Balayage"], "Cran"),
      ]},
    ],
    turns: [
      { turn: 1, actions: ["Protection", "Tourmagik", "Vent Arrière", "Anti-Brume"] },
      { turn: 2, actions: ["Hydrocanon", "Hydrocanon", "Hydrocanon", "Air Veinard"] },
      { turn: 3, actions: ["Hydroblast", "Hydroblast", "Hydroblast", "Vœu"] },
      { turn: 4, actions: ["Cognobidon", "Boost sur J1", "Distorsion", "Permuforce (Mastouffe)"] },
      { turn: 5, actions: ["Boost sur J2", "Psykoud’Boul", "Boost sur J2", "Rune Protect"] },
      { turn: 6, actions: ["Protection", "Psykoud’Boul", "Psykoud’Boul", "Gravité"] },
      { turn: 7, actions: ["Tunnelier", "Tunnelier", "Tunnelier", "Air Veinard"] },
      { turn: 8, actions: ["Chatouille", "Gyroballe", "Gyroballe", "Prévention"] },
      { turn: 9, actions: ["À la Queue", "Gyroballe", "Gyroballe", "Distorsion"] },
      { turn: 10, actions: ["Martobois", "Feu Follet", "Close Combat", "Close Combat"] },
      { turn: 11, actions: ["Garde Large", "Chatouille", "Coup d’Main", "Balayage"] },
      { turn: 12, actions: ["Martobois", "Martobois", "Coup d’Main", "Balayage"] },
      { turn: 13, actions: ["Martobois", "Martobois", "Coup d’Main", "Fin du combat"] },
      { turn: 14, actions: ["Martobois", "Fin du combat", "Fin du combat", "Fin du combat"] },
    ],
  },
  {
    id: "viridium",
    boss: "Viridium",
    bossId: 640,
    stars: 5,
    types: ["Plante", "Combat"],
    region: "Unys",
    location: "Forêt d’Empoigne",
    accent: "#78e890",
    summary: "Pression Vol, sacrifices contrôlés et phase Tunnel synchronisée sur quatre joueurs.",
    warnings: [
      "Tour 1 : si Coatox tombe, recommencer.",
      "Tour 3 : si un Airmure tombe trop tôt, recommencer.",
      "Tour 5 : si un Étouraptor tombe avant la fenêtre prévue, recommencer.",
      "Tour 8 : le Scorvol du joueur 3 doit rester en place jusqu’à son action.",
      "Tour 10 : Lumivole doit réussir Charme avant de tomber.",
    ],
    players: [
      { label: "Joueur 1", role: "Air Veinard & vol", team: [
        p("Lippoutou", 124, "Ceinture Force", "+ Vitesse", "31 Vit", "252 Vit", ["Air Veinard"], "Benêt"),
        p("Airmure", 227, "Orbe Vie", "Malin / Lâche / Relax", "31 PV / 31 Def", "252 PV / 252 Def", ["Rapace"]),
        p("Étouraptor", 398, "Baie Charti", "Malin / Lâche / Relax", "31 PV / 31 Def", "252 PV / 252 Def", ["Rapace", "Tout ou Rien"], "Intimidation"),
        p("Scorvol", 472, "Joyau Vol", "Malin / Lâche / Relax", "31 PV / 31 Atk / 31 Def", "252 PV / 36 Atk", ["Acrobatie"]),
        p("Métalosse", 376, "Baie Jaboca", "Malin / Lâche / Relax", "31 PV / 31 Atk / 31 Def", "252 PV / 136 Atk / 124 Def", ["Casse Brique", "Explosion"], "Corps Sain"),
        p("Carchacrok", 445, "Casque Brut", "Malin / Lâche / Relax", "31 PV / 31 Atk / 31 Def / 25+ Vit", "252 PV / 4 Atk / 252 Def", ["Tunnel"], "Peau Dure"),
      ]},
      { label: "Joueur 2", role: "Protection & explosion", team: [
        p("Lippoutou", 124, "Lumargile", "+ Vitesse", "31 Vit", "252 Vit", ["Protection"], "Benêt"),
        p("Airmure", 227, "Orbe Vie", "Malin / Lâche / Relax", "31 PV / 31 Def", "252 PV / 252 Def", ["Rapace"]),
        p("Étouraptor", 398, "Baie Charti", "Malin / Lâche / Relax", "31 PV / 31 Def", "252 PV / 252 Def", ["Rapace", "Tout ou Rien"], "Intimidation"),
        p("Scorvol", 472, "Joyau Vol", "Malin / Lâche / Relax", "31 PV / 31 Atk / 31 Def", "252 PV / 36 Atk", ["Acrobatie"]),
        p("Métalosse", 376, "Baie Jaboca", "Malin / Lâche / Relax", "31 PV / 31 Atk / 31 Def", "252 PV / 128 Atk / 128 Def", ["Protection", "Explosion"], "Corps Sain"),
        p("Carchacrok", 445, "Casque Brut", "Malin / Lâche / Relax", "31 PV / 31 Atk / 31 Def / 25+ Vit", "252 PV / 4 Atk / 252 Def", ["Tunnel"], "Peau Dure"),
      ]},
      { label: "Joueur 3", role: "Tourmagik & Charme", team: [
        p("Lippoutou", 124, "Orbe Flamme", "+ Vitesse", "31 Vit", "252 Vit", ["Tourmagik"], "Benêt"),
        p("Airmure", 227, "Orbe Vie", "Malin / Lâche / Relax", "31 PV / 31 Def", "252 PV / 252 Def", ["Rapace"]),
        p("Étouraptor", 398, "Baie Charti", "Malin / Lâche / Relax", "31 PV / 31 Def", "252 PV / 252 Def", ["Rapace", "Tout ou Rien"], "Téméraire"),
        p("Scorvol", 472, "Joyau Vol", "Malin / Lâche / Relax", "31 PV / 31 Atk / 31 Def", "156 PV / 36 Atk / 252 Def", ["Acrobatie", "Casse Brique"]),
        p("Lumivole", 314, "Baie Jaboca", "Malin / Lâche / Relax", "+7 PV / +7 Def / +7 Vit", "252 Def / 252 Vit", ["Charme"], "Benêt"),
        p("Carchacrok", 445, "Casque Brut", "Malin / Lâche / Relax", "31 PV / 31 Atk / 31 Def / 25+ Vit", "252 PV / 4 Atk / 252 Def", ["Tunnel"], "Peau Dure"),
      ]},
      { label: "Joueur 4", role: "Ouverture & finish", team: [
        p("Coatox", 454, "Bandeau Choix", "Rigide / Mauvais", "31 PV / 31 Atk / 31 Def / 31 Vit", "188 PV / 252 Atk / 8 Def / 32 Vit", ["Aéropique"], "Peau Sèche / Anticipation"),
        p("Airmure", 227, "Baie Sitrus", "Malin / Lâche / Relax", "31 PV / 31 Atk / 31 Def", "225 PV / 36 Atk", ["Rapace"]),
        p("Étouraptor", 398, "Baie Charti", "Malin / Lâche / Relax", "31 PV / 31 Def", "252 PV / 252 Def", ["Rapace", "Tout ou Rien"], "Téméraire"),
        p("Lippoutou", 124, "Ceinture Force", "+ Vitesse", "31 Def", "252 Vit", ["Air Veinard"], "Benêt"),
        p("Métalosse", 376, "Orbe Flamme", "Malin / Lâche / Relax", "31 PV / 31 Def", "252 Def", ["Tourmagik"], "Corps Sain"),
        p("Carchacrok", 445, "Casque Brut", "Malin / Lâche / Relax", "31 PV / 31 Atk / 31 Def / 25+ Vit", "252 PV / 4 Atk / 252 Def", ["Tunnel", "Séisme"], "Peau Dure"),
      ]},
    ],
    turns: [
      { turn: 1, actions: ["Air Veinard", "Protection", "Tourmagik", "Aéropique"] },
      { turn: 2, actions: ["Rapace", "Rapace", "Rapace", "Aéropique"] },
      { turn: 3, actions: ["Rapace", "Rapace", "Rapace", "Rapace"] },
      { turn: 4, actions: ["Airmure tombe", "Airmure tombe", "Airmure tombe", "Airmure tombe"] },
      { turn: 5, actions: ["Rapace", "Rapace", "Rapace", "Rapace"] },
      { turn: 6, actions: ["Tout ou Rien", "Tout ou Rien", "Tout ou Rien", "Tout ou Rien"] },
      { turn: 7, actions: ["Acrobatie", "Acrobatie", "Acrobatie", "Air Veinard"] },
      { turn: 8, actions: ["Scorvol tombe", "Scorvol tombe", "Casse Brique", "Tourmagik"] },
      { turn: 9, actions: ["Casse Brique", "Protection", "Scorvol tombe", "Métalosse tombe"] },
      { turn: 10, actions: ["Explosion", "Explosion", "Charme", "Séisme"] },
      { turn: 11, actions: ["Tunnel", "Tunnel", "Tunnel", "Tunnel"] },
      { turn: 12, actions: ["Animation Tunnel", "Animation Tunnel", "Animation Tunnel", "Animation Tunnel"] },
      { turn: 13, actions: ["Tunnel", "Tunnel", "Tunnel", "Tunnel"] },
      { turn: 14, actions: ["Animation Tunnel", "Animation Tunnel", "Animation Tunnel", "Animation Tunnel"] },
      { turn: 15, actions: ["Tunnel", "Tunnel", "Tunnel", "Tunnel"] },
    ],
  },
];
