#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Analyzes package.json to identify potentially unused dependencies
 */

const fs = require("fs")

const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"))
const dependencies = { ...packageJson.dependencies }

console.log("🔍 Analyzing Bundle Dependencies\n")
console.log("=".repeat(80))

// Check for large known packages
const largePackages = {
  recharts: { size: "~200KB", usage: "Charting library - check if used" },
  "lucide-react": { size: "~800KB uncompressed", usage: "Icon library - consider tree-shaking" },
  "date-fns": { size: "~70KB", usage: "Date utilities - check if needed (app uses Date.now())" },
  "react-hook-form": { size: "~40KB", usage: "Form library - check if forms exist" },
  "@vercel/analytics": { size: "~20KB", usage: "Analytics - verify if configured" },
  cmdk: { size: "~30KB", usage: "Command menu - check if used" },
  "embla-carousel-react": { size: "~40KB", usage: "Carousel - check if used" },
  "react-day-picker": { size: "~50KB", usage: "Date picker - check if used" },
  vaul: { size: "~20KB", usage: "Drawer component - check if used" },
  sonner: { size: "~15KB", usage: "Toast notifications - check if used" },
  "next-themes": { size: "~8KB", usage: "Theme switcher - check if used" },
}

// Count Radix UI packages
const radixPackages = Object.keys(dependencies).filter((dep) => dep.startsWith("@radix-ui/"))

console.log("\n📦 Large Packages Found:\n")
let totalEstimatedSize = 0
let largePackagesFound = []

Object.keys(largePackages).forEach((pkg) => {
  if (dependencies[pkg]) {
    console.log(`  ⚠️  ${pkg}`)
    console.log(`     Size: ${largePackages[pkg].size}`)
    console.log(`     Usage: ${largePackages[pkg].usage}\n`)
    largePackagesFound.push(pkg)

    // Estimate size in KB
    const sizeMatch = largePackages[pkg].size.match(/(\d+)KB/)
    if (sizeMatch) {
      totalEstimatedSize += parseInt(sizeMatch[1])
    }
  }
})

console.log("=".repeat(80))
console.log(`\n🎨 Radix UI Components: ${radixPackages.length} packages installed\n`)

// Known used components in dungeon-crawler
const likelyUsedRadix = [
  "@radix-ui/react-dialog",
  "@radix-ui/react-tabs",
  "@radix-ui/react-slot", // Used by Button via shadcn
]

const potentiallyUnusedRadix = radixPackages.filter((pkg) => !likelyUsedRadix.includes(pkg))

console.log("✅ Likely Used:")
likelyUsedRadix.forEach((pkg) => {
  if (dependencies[pkg]) {
    console.log(`   - ${pkg}`)
  }
})

console.log("\n⚠️  Potentially Unused (need verification):")
potentiallyUnusedRadix.forEach((pkg) => {
  console.log(`   - ${pkg}`)
})

console.log("\n" + "=".repeat(80))
console.log("\n💡 Optimization Recommendations:\n")

console.log("1. High Priority - Remove Unused Large Packages:")
largePackagesFound.forEach((pkg) => {
  console.log(`   - Verify usage of ${pkg} and remove if unused`)
})

console.log("\n2. Medium Priority - Radix UI Cleanup:")
console.log(`   - Found ${potentiallyUnusedRadix.length} potentially unused Radix components`)
console.log('   - Run: grep -r "@radix-ui/react-" components/ lib/ app/ to verify usage')
console.log("   - Estimated savings: 200-400KB gzipped")

console.log("\n3. Tree-Shaking Opportunities:")
console.log("   - lucide-react: Import specific icons instead of entire library")
console.log('   - Example: import { Sword, Shield } from "lucide-react"')

console.log("\n4. Bundle Analysis Command:")
console.log('   - Add to package.json: "analyze": "ANALYZE=true next build"')
console.log("   - Install: @next/bundle-analyzer")

console.log("\n" + "=".repeat(80))
console.log(`\n📊 Estimated Optimization Potential: ${totalEstimatedSize}KB - 600KB\n`)

// Create a detailed report
const report = {
  timestamp: new Date().toISOString(),
  totalDependencies: Object.keys(dependencies).length,
  radixPackages: radixPackages.length,
  largePackages: largePackagesFound.length,
  estimatedSavings: `${totalEstimatedSize}KB - 600KB`,
  recommendations: [
    "Remove unused large packages",
    "Clean up unused Radix UI components",
    "Implement tree-shaking for icon libraries",
    "Set up bundle analyzer for production builds",
  ],
}

fs.writeFileSync("./bundle-analysis-report.json", JSON.stringify(report, null, 2))
console.log("📄 Detailed report saved to: bundle-analysis-report.json\n")
