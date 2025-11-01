import type { Encounter } from "../schemas"

export const encounters: Encounter[] = [
  {
    id: "encounter:mysterious_merchant",
    entityType: "encounter",
    name: "Mysterious Merchant",
    rarity: "uncommon",
    icon: "ra-player",
    description: "Mysterious Merchant appears. Selling health potions.",
    source: "canonical",
    version: 1,
    sessionOnly: false,
    tags: ["npc", "shop"],
    choices: [
      {
        text: "Buy health potion (20g)",
        outcome: {
          message: "Potion purchased. Restored 30 HP.",
          goldChange: -20,
          healthChange: 30,
        },
      },
      {
        text: "Decline and move on",
        outcome: {
          message: "Merchant declined. Continue exploring.",
        },
      },
    ],
  },
  {
    id: "encounter:magical_fountain",
    entityType: "encounter",
    name: "Magical Fountain",
    rarity: "rare",
    icon: "ra-droplet",
    description: "Magical Fountain discovered. Can restore health.",
    source: "canonical",
    version: 1,
    sessionOnly: false,
    tags: ["object", "healing"],
    color: "text-cyan-400", // Custom healing/water color
    choices: [
      {
        text: "Drink from fountain",
        outcome: {
          message: "Health fully restored.",
        },
      },
      {
        text: "Continue without drinking",
        outcome: {
          message: "Fountain ignored. Continue exploring.",
        },
      },
    ],
  },
  {
    id: "encounter:ancient_altar",
    entityType: "encounter",
    name: "Ancient Altar",
    rarity: "epic",
    icon: "ra-rune-stone",
    description: "Ancient Altar found. Can exchange gold for experience.",
    source: "canonical",
    version: 1,
    sessionOnly: false,
    tags: ["object", "ritual"],
    color: "text-indigo-400", // Custom mystical/ritual color
    choices: [
      {
        text: "Offer gold (15g)",
        outcome: {
          message: "Offering accepted. Gained 40 exp.",
          goldChange: -15,
          experienceChange: 40,
        },
      },
      {
        text: "Leave altar alone",
        outcome: {
          message: "Altar ignored. Continue exploring.",
        },
      },
    ],
  },
]
