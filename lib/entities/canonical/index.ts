import { enemies } from "./enemies"
import { treasures } from "./treasures"
import { consumables } from "./consumables"
import { maps } from "./maps"
import { encounters } from "./encounters"
import type { Entity } from "../schemas"

// Export individual arrays
export { enemies, treasures, consumables, maps, encounters }

// Export combined array of all canonical entities
export const allCanonicalEntities: Entity[] = [
  ...enemies,
  ...treasures,
  ...consumables,
  ...maps,
  ...encounters,
]

// Export counts
export const canonicalCounts = {
  enemies: enemies.length,
  treasures: treasures.length,
  consumables: consumables.length,
  maps: maps.length,
  encounters: encounters.length,
  total: allCanonicalEntities.length,
}
