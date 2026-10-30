export type MobileModPart = { label: string; url?: string; fallbackName: string; assetName?: string };
export type MobileModEntry = { id: string; title: string; description: string; parts: MobileModPart[]; note?: string; manualOnly?: boolean };

export const MOBILE_MODS: MobileModEntry[] = [
  { id: "alya-no-cries", title: "ALYA · No Pokémon Cries", description: "Supprime les cris des Pokémon en combat.", parts: [{ label: "Mod ALYA", fallbackName: "ALYA-No-Pokemon-Cries.mod", assetName: "ALYA-No-Pokemon-Cries.mod" }] },
  { id: "alya-shiny-sound", title: "ALYA · Shiny Sound", description: "Remplace le son de la particule shiny par la soundboard Miaou.", parts: [{ label: "Mod ALYA", fallbackName: "Alya-Shiny-Sound-Louder.mod", assetName: "Alya-Shiny-Sound-Louder.mod" }] },
  { id: "followers-gen5", title: "Followers 5G", description: "Affiche les Pokémon de la 5G derrière le joueur.", parts: [{ label: "Télécharger", url: "https://www.mediafire.com/file/tsof5wg6tko16pu/PokeMMO_Gen_5_Follower_Sprites_%28Sparkly_Shiny_%26_Jump_Version%29.mod/file", fallbackName: "PokeMMO_Gen_5_Follower_Sprites.mod" }] },
  { id: "bag-hd", title: "Objets / Balls HD", description: "Icônes HD du sac inspirées des jeux Switch.", parts: [{ label: "Télécharger", url: "https://www.mediafire.com/file/r7lj31cwfrkgvbb", fallbackName: "PokeMMO_HD_Bag_Icons.mod" }] },
  { id: "music-hd", title: "Musiques HD", description: "Musiques des régions issues des versions et remakes récents.", note: "Les deux fichiers sont requis.", parts: [
    { label: "General Music", url: "https://www.mediafire.com/file/ihoobhz3ruxuku9/TDG_General_Music.mod/file", fallbackName: "TDG_General_Music.mod" },
    { label: "Let's Go+", url: "https://www.mediafire.com/file/jjx91fo29pczx0j/TDG_Lets_Go%21%2B.mod/file", fallbackName: "TDG_Lets_Go+.mod" },
  ] },
  { id: "home-icons", title: "Icônes Pokémon HOME", description: "Icônes HD de Pokémon HOME pour l'équipe et le PC.", manualOnly: true, note: "MEGA : téléchargement dans le navigateur puis bouton Importer.", parts: [{ label: "Ouvrir MEGA", url: "https://mega.nz/file/HEITjQSR#b3RfEG45sJ5uzCQVB2XchaP3EoMfwGtu4fr7QAZl-E0", fallbackName: "Pokemon_HOME_Icons.mod" }] },
  { id: "nds-trainers", title: "Sprites dresseurs NDS", description: "Sprites NDS dans les régions issues des jeux GBA.", parts: [{ label: "Télécharger", url: "https://www.mediafire.com/file/n3tjff9cft93nfo", fallbackName: "NDS_Trainers.mod" }] },
  { id: "bsreloaded", title: "Sprites 4K Switch UHD", description: "Pack haute qualité BSReloaded UHD.", note: "4 parties · pack volumineux (~3,6 Go).", parts: [
    { label: "Partie 1", url: "https://www.mediafire.com/file/mtsnupl5xpez0jo/BSReloadedUHD1.zip/file", fallbackName: "BSReloadedUHD1.zip" },
    { label: "Partie 2", url: "https://www.mediafire.com/file/15fggdr3ke2suc1/BSReloadedUHD2.zip/file", fallbackName: "BSReloadedUHD2.zip" },
    { label: "Partie 3", url: "https://www.mediafire.com/file/0lfr55tsv1mfi1n/BSReloadedUHD3.zip/file", fallbackName: "BSReloadedUHD3.zip" },
    { label: "Partie 4", url: "https://www.mediafire.com/file/vmq3lzg3ki85uci/BSReloadedUHD4.zip/file", fallbackName: "BSReloadedUHD4.zip" },
  ] },
  { id: "shiny-4k", title: "Sprites 4K Shiny", description: "Sprites shiny 4K plus grands.", parts: [{ label: "Télécharger", url: "https://drive.google.com/file/d/15wcTF7a8dQRTA7VRB4tJdV9yTfKJWEB8/view?usp=sharing", fallbackName: "Shiny_4K.zip" }] },
];
