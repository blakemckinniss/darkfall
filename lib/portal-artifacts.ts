/**
 * Portal-Exclusive Artifacts System
 *
 * Handles drop logic, tracking, and eligibility for rare portal-exclusive artifacts
 * that can only be obtained once per game from specific portal themes.
 */

import { Treasure } from "./entities/schemas"

export interface PortalContext {
  theme: string // Portal theme (e.g., "Dragon's Lair")
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  currentRoom: number
  expectedRooms: number
  stability: number
  locationId: string
}

/**
 * Check if a portal-exclusive artifact is eligible to drop
 *
 * @param artifact - The artifact treasure item to check
 * @param portal - Current portal context
 * @param obtainedArtifacts - Array of artifact IDs already obtained globally
 * @returns true if artifact is eligible to drop
 */
export function isArtifactEligible(
  artifact: Treasure,
  portal: PortalContext,
  obtainedArtifacts: string[]
): boolean {
  // Must have portalExclusive metadata
  if (!artifact.portalExclusive) {
    return false
  }

  const { requiredPortalTheme, requiredRarity, globallyUnique } = artifact.portalExclusive

  // Check if already obtained (if globally unique)
  if (globallyUnique && obtainedArtifacts.includes(artifact.id)) {
    return false
  }

  // Check portal theme requirement
  if (requiredPortalTheme && portal.theme !== requiredPortalTheme) {
    return false
  }

  // Check portal rarity requirement
  if (requiredRarity) {
    const rarityOrder = ["common", "uncommon", "rare", "epic", "legendary"]
    const requiredIndex = rarityOrder.indexOf(requiredRarity)
    const portalIndex = rarityOrder.indexOf(portal.rarity)

    if (portalIndex < requiredIndex) {
      return false
    }
  }

  return true
}

/**
 * Roll for portal-exclusive artifact drop
 *
 * @param artifact - The artifact to roll for
 * @param portal - Current portal context
 * @param obtainedArtifacts - Array of artifact IDs already obtained
 * @returns true if artifact should drop
 */
export function rollArtifactDrop(
  artifact: Treasure,
  portal: PortalContext,
  obtainedArtifacts: string[]
): boolean {
  if (!isArtifactEligible(artifact, portal, obtainedArtifacts)) {
    return false
  }

  const dropChance = artifact.portalExclusive?.dropChance ?? 0.15
  return Math.random() < dropChance
}

/**
 * Get all eligible portal-exclusive artifacts for current portal
 *
 * @param allArtifacts - All available portal-exclusive artifacts
 * @param portal - Current portal context
 * @param obtainedArtifacts - Array of artifact IDs already obtained
 * @returns Array of eligible artifacts
 */
export function getEligibleArtifacts(
  allArtifacts: Treasure[],
  portal: PortalContext,
  obtainedArtifacts: string[]
): Treasure[] {
  return allArtifacts.filter((artifact) => isArtifactEligible(artifact, portal, obtainedArtifacts))
}

/**
 * Attempt to drop a portal-exclusive artifact
 * Returns the artifact if successful, null otherwise
 *
 * @param allArtifacts - All available portal-exclusive artifacts
 * @param portal - Current portal context
 * @param obtainedArtifacts - Array of artifact IDs already obtained
 * @returns Dropped artifact or null
 */
export function attemptArtifactDrop(
  allArtifacts: Treasure[],
  portal: PortalContext,
  obtainedArtifacts: string[]
): Treasure | null {
  const eligible = getEligibleArtifacts(allArtifacts, portal, obtainedArtifacts)

  if (eligible.length === 0) {
    return null
  }

  // Roll for each eligible artifact
  for (const artifact of eligible) {
    if (rollArtifactDrop(artifact, portal, obtainedArtifacts)) {
      return artifact
    }
  }

  return null
}
