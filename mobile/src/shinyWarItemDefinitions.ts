export type ShinyWarItemDefinition = {
  key: string;
  label: string;
  iconSources: string[];
  extraIcons?: string[];
  unitValue: number;
  fossil?: boolean;
};

export const SHINY_WAR_ITEM_ROWS: ShinyWarItemDefinition[] = [
  {
    key: "item-1",
    label: "Item 1",
    iconSources: ["https://cdn.discordapp.com/emojis/1230000325163876422.webp?size=44"],
    extraIcons: ["https://cdn.discordapp.com/emojis/1384122391474737172.webp?size=32"],
    unitValue: 1,
  },
  {
    key: "item-2",
    label: "Item 2",
    iconSources: ["/assets/shinywar/shinywar-item-2.png"],
    unitValue: 1,
  },
  {
    key: "item-3",
    label: "Item 3",
    iconSources: ["/assets/shinywar/shinywar-item-3.png"],
    unitValue: 1,
  },
  {
    key: "item-4",
    label: "Item 4",
    iconSources: ["https://cdn.discordapp.com/emojis/1375472014533595186.webp?size=44"],
    unitValue: 1,
  },
  {
    key: "item-5",
    label: "Item 5",
    iconSources: ["https://cdn.discordapp.com/emojis/1153784989163470970.webp?size=44"],
    unitValue: 1,
  },
  {
    key: "item-6",
    label: "Item 6",
    iconSources: ["/assets/shinywar/shinywar-item-6.png"],
    unitValue: 1,
  },
  {
    key: "item-7",
    label: "Item 7",
    iconSources: ["/assets/shinywar/shinywar-item-7.png"],
    unitValue: 1,
  },
  {
    key: "item-new-before-fossils",
    label: "Item 8",
    iconSources: ["https://cdn.discordapp.com/emojis/1260898524254703747.webp?size=32"],
    unitValue: 1,
  },

  { key: "fossil-helix", label: "Fossile Nautile", iconSources: ["/assets/shinywar/fossil-helix.png"], unitValue: 1, fossil: true },
  { key: "fossil-dome", label: "Fossile Dôme", iconSources: ["/assets/shinywar/fossil-dome.png"], unitValue: 1, fossil: true },
  { key: "fossil-old-amber", label: "Vieil Ambre", iconSources: ["/assets/shinywar/fossil-old-amber.png"], unitValue: 1, fossil: true },
  { key: "fossil-root", label: "Fossile Racine", iconSources: ["/assets/shinywar/fossil-root.png"], unitValue: 1, fossil: true },
  { key: "fossil-claw", label: "Fossile Griffe", iconSources: ["/assets/shinywar/fossil-claw.png"], unitValue: 1, fossil: true },
  { key: "fossil-skull", label: "Fossile Crâne", iconSources: ["/assets/shinywar/fossil-skull.png"], unitValue: 1, fossil: true },
  { key: "fossil-armor", label: "Fossile Armure", iconSources: ["/assets/shinywar/fossil-armor.png"], unitValue: 1, fossil: true },
  { key: "fossil-cover", label: "Fossile Plaque", iconSources: ["/assets/shinywar/fossil-cover.png"], unitValue: 1, fossil: true },
  { key: "fossil-plume", label: "Fossile Plume", iconSources: ["/assets/shinywar/fossil-plume.png"], unitValue: 1, fossil: true },
];

export const SHINY_WAR_ITEM_COUNT = SHINY_WAR_ITEM_ROWS.length;
export const SHINY_WAR_FOSSIL_START_INDEX = 8;
