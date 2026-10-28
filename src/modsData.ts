export type ModCategory = "ALYA" | "Graphismes" | "Audio" | "Followers";

export type RemoteModFile = {
  url: string;
  fileName: string;
};

export type ModSource =
  | {
      kind: "bundled";
      resourceFile: string;
      targetFile: string;
      sha256: string;
    }
  | {
      kind: "remote";
      host: "MediaFire" | "MEGA" | "Google Drive";
      files: RemoteModFile[];
    };

export type AlyaMod = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: ModCategory;
  source: ModSource;
  sizeLabel?: string;
  note?: string;
  featured?: boolean;
};

export const ALYA_MODS: readonly AlyaMod[] = [
  {
    id: "alya-no-cries",
    name: "ALYA · No Pokémon Cries",
    shortName: "No Pokémon Cries",
    description: "Supprime les cris des Pokémon en combat tout en conservant les autres effets sonores.",
    category: "Audio",
    source: {
      kind: "bundled",
      resourceFile: "ALYA-No-Pokemon-Cries.mod",
      targetFile: "ALYA-No-Pokemon-Cries.mod",
      sha256: "f1ed10d95df5aa5f3234b2f027e55ef6302dbf17365c60c064be625e15d2067f",
    },
    sizeLabel: "≈ 113 Ko",
    featured: true,
  },
  {
    id: "alya-shiny-sound",
    name: "ALYA · Shiny Sound",
    shortName: "Shiny Sound",
    description: "Remplace le son de la particule shiny par le son miaou de la soundboard ALYA.",
    category: "Audio",
    source: {
      kind: "bundled",
      resourceFile: "ALYA-Shiny-Sound-Louder.mod",
      targetFile: "ALYA-Shiny-Sound-Louder.mod",
      sha256: "a8098819e33e3b1e5cefefb59ba42efe159bce77da363face4e09cc69e4d198c",
    },
    sizeLabel: "≈ 377 Ko",
    featured: true,
  },
  {
    id: "alya-follower-exact-carcha",
    name: "ALYA · Follower Sprites Exact Carcha",
    shortName: "Follower Exact Carcha",
    description: "Pack ALYA de sprites followers shiny retravaillés, notamment pour Ectoplasma et Carchacrok.",
    category: "Followers",
    source: {
      kind: "bundled",
      resourceFile: "ALYA-Follower-Sprites-Exact-Carcha.mod",
      targetFile: "ALYA-Follower-Sprites-Exact-Carcha.mod",
      sha256: "cf1275b8e5ea9bce587c79ae337bf52d6cf49b5028bbbb6be1c2ad707187f499",
    },
    sizeLabel: "≈ 83 Ko",
  },
  {
    id: "alya-gen5-followers-exact-carcha",
    name: "ALYA · Gen 5 Followers Exact Carcha",
    shortName: "Gen 5 Followers ALYA",
    description: "Version ALYA du pack de followers 5G avec animations shiny et jump.",
    category: "Followers",
    source: {
      kind: "bundled",
      resourceFile: "ALYA-Gen5-Follower-Sprites-Exact-Carcha.mod",
      targetFile: "ALYA-Gen5-Follower-Sprites-Exact-Carcha.mod",
      sha256: "9cfcf27ad5ea74c9501327a1fc69180af3ffe3a59f9b59e41ea5df54eee63ab6",
    },
    sizeLabel: "≈ 6,3 Mo",
  },
  {
    id: "alya-pmd-followers",
    name: "ALYA · PMD Followers with Sparkles",
    shortName: "PMD Followers",
    description: "Sprites followers inspirés de Pokémon Donjon Mystère avec variantes shiny scintillantes.",
    category: "Followers",
    source: {
      kind: "bundled",
      resourceFile: "ALYA-PMD-Followers-Sparkles-Exact-Carcha.mod",
      targetFile: "ALYA-PMD-Followers-Sparkles-Exact-Carcha.mod",
      sha256: "e95020522b3a053ffcfb9fe25db62b2556ba9d41b622ab4a59151e2cf33f78c2",
    },
    sizeLabel: "≈ 26 Mo",
  },
  {
    id: "alya-sparkling-exact-carcha",
    name: "ALYA · Sparkling Shinies Exact Carcha",
    shortName: "Sparkling Shinies",
    description: "Sprites de combat shiny avec animation scintillante renforcée.",
    category: "Graphismes",
    source: {
      kind: "bundled",
      resourceFile: "ALYA-Sparkling-Exact-Carcha.zip",
      targetFile: "ALYA-Sparkling-Exact-Carcha.zip",
      sha256: "a0d7ac3655df210f339800da4cb8634f10af74d1a397f5db1263d75881169a57",
    },
    sizeLabel: "≈ 54 Mo",
  },
  {
    id: "gen5-followers-online",
    name: "Followers Pokémon 5G",
    shortName: "Followers 5G",
    description: "Ajoute les Pokémon de la 5G derrière ton personnage avec animations shiny et jump.",
    category: "Followers",
    source: {
      kind: "remote",
      host: "MediaFire",
      files: [
        {
          url: "https://www.mediafire.com/file/tsof5wg6tko16pu/PokeMMO_Gen_5_Follower_Sprites_%28Sparkly_Shiny_%26_Jump_Version%29.mod/file",
          fileName: "PokeMMO_Gen_5_Follower_Sprites_(Sparkly_Shiny_&_Jump_Version).mod",
        },
      ],
    },
  },
  {
    id: "switch-bag-icons",
    name: "Icônes HD du sac · style Switch",
    shortName: "Sac HD Switch",
    description: "Remplace les objets et Balls du sac par des icônes HD inspirées des jeux Pokémon Switch.",
    category: "Graphismes",
    source: {
      kind: "remote",
      host: "MediaFire",
      files: [
        {
          url: "https://www.mediafire.com/file/r7lj31cwfrkgvbb",
          fileName: "ALYA-HD-Switch-Bag-Icons.mod",
        },
      ],
    },
  },
  {
    id: "hd-music-pack",
    name: "Musiques HD · régions complètes",
    shortName: "Musiques HD",
    description: "Remplace les musiques des régions par des versions issues des jeux et remakes plus récents.",
    category: "Audio",
    source: {
      kind: "remote",
      host: "MediaFire",
      files: [
        {
          url: "https://www.mediafire.com/file/ihoobhz3ruxuku9/TDG_General_Music.mod/file",
          fileName: "TDG_General_Music.mod",
        },
        {
          url: "https://www.mediafire.com/file/jjx91fo29pczx0j/TDG_Lets_Go%21%2B.mod/file",
          fileName: "TDG_Lets_Go!+.mod",
        },
      ],
    },
    note: "Les 2 fichiers sont nécessaires.",
  },
  {
    id: "home-icons",
    name: "Icônes Pokémon HOME HD",
    shortName: "Icônes HOME",
    description: "Affiche des icônes Pokémon HOME HD pour les Pokémon de l'équipe et du PC.",
    category: "Graphismes",
    source: {
      kind: "remote",
      host: "MEGA",
      files: [
        {
          url: "https://mega.nz/file/HEITjQSR#b3RfEG45sJ5uzCQVB2XchaP3EoMfwGtu4fr7QAZl-E0",
          fileName: "ALYA-Pokemon-HOME-HD-Icons.mod",
        },
      ],
    },
  },
  {
    id: "nds-trainers",
    name: "Sprites Dresseurs NDS · Kanto / Hoenn",
    shortName: "Dresseurs NDS",
    description: "Remplace les sprites de dresseurs des régions issues des jeux GBA par un rendu de style NDS.",
    category: "Graphismes",
    source: {
      kind: "remote",
      host: "MediaFire",
      files: [
        {
          url: "https://www.mediafire.com/file/n3tjff9cft93nfo",
          fileName: "ALYA-NDS-Trainer-Sprites-Kanto-Hoenn.mod",
        },
      ],
    },
  },
  {
    id: "bs-reloaded-uhd",
    name: "Battle Sprites Reloaded UHD · 4K",
    shortName: "Battle Sprites UHD",
    description: "Pack de sprites de combat 4K Switch en très haute définition.",
    category: "Graphismes",
    source: {
      kind: "remote",
      host: "MediaFire",
      files: [
        { url: "https://www.mediafire.com/file/mtsnupl5xpez0jo/BSReloadedUHD1.zip/file", fileName: "BSReloadedUHD1.zip" },
        { url: "https://www.mediafire.com/file/15fggdr3ke2suc1/BSReloadedUHD2.zip/file", fileName: "BSReloadedUHD2.zip" },
        { url: "https://www.mediafire.com/file/0lfr55tsv1mfi1n/BSReloadedUHD3.zip/file", fileName: "BSReloadedUHD3.zip" },
        { url: "https://www.mediafire.com/file/vmq3lzg3ki85uci/BSReloadedUHD4.zip/file", fileName: "BSReloadedUHD4.zip" },
      ],
    },
    sizeLabel: "≈ 3,6 Go",
    note: "Très volumineux : les 4 parties sont téléchargées et installées ensemble.",
    featured: true,
  },
  {
    id: "shiny-4k-large",
    name: "Sprites Shiny 4K · grand format",
    shortName: "Shiny 4K",
    description: "Pack de sprites shiny 4K avec un rendu plus grand en combat.",
    category: "Graphismes",
    source: {
      kind: "remote",
      host: "Google Drive",
      files: [
        {
          url: "https://drive.google.com/file/d/15wcTF7a8dQRTA7VRB4tJdV9yTfKJWEB8/view?usp=sharing",
          fileName: "ALYA-Shiny-Sprites-4K-Large.mod",
        },
      ],
    },
  },
];
