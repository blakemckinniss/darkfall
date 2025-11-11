/**
 * Dependency Cruiser Configuration Template
 *
 * Enforces module boundary rules (layering)
 * Works with: dependency-cruiser (Node.js/TypeScript projects)
 *
 * CUSTOMIZATION:
 * 1. Edit "forbidden" rules to match your architecture
 * 2. Update "allowed" paths for your project structure
 * 3. Run: dependency-cruiser --validate .dependency-cruiser.js src/
 */

module.exports = {
  forbidden: [
    /**
     * LAYER VIOLATIONS
     * Prevent lower layers from importing higher layers
     */
    {
      name: 'no-components-to-app',
      comment: 'Components should not import from app/ (upward dependency)',
      severity: 'error',
      from: { path: '^components/' },
      to: { path: '^app/' }
    },
    {
      name: 'no-lib-to-components',
      comment: 'Lib should not import from components/ (upward dependency)',
      severity: 'error',
      from: { path: '^lib/' },
      to: { path: '^components/' }
    },
    {
      name: 'no-lib-to-app',
      comment: 'Lib should not import from app/ (upward dependency)',
      severity: 'error',
      from: { path: '^lib/' },
      to: { path: '^app/' }
    },

    /**
     * CIRCULAR DEPENDENCIES
     * Prevent circular imports between modules
     */
    {
      name: 'no-circular',
      comment: 'Circular dependencies make code hard to understand and test',
      severity: 'warn',
      from: {},
      to: { circular: true }
    },

    /**
     * ORPHAN MODULES
     * Detect unreachable code
     */
    {
      name: 'no-orphans',
      comment: 'Orphan modules are unreachable code (dead code)',
      severity: 'warn',
      from: { orphan: true },
      to: {}
    },

    /**
     * EXAMPLE: Feature isolation
     * Uncomment to enforce feature module boundaries
     */
    // {
    //   name: 'feature-isolation',
    //   comment: 'Features should not import from each other directly',
    //   severity: 'error',
    //   from: { path: '^features/([^/]+)/' },
    //   to: {
    //     path: '^features/([^/]+)/',
    //     pathNot: '$1'  // Allow imports within same feature
    //   }
    // }
  ],

  options: {
    /**
     * SCOPE
     * Which files to include in analysis
     */
    doNotFollow: {
      // Exclude these paths from dependency analysis
      path: [
        'node_modules',
        'dist',
        'build',
        '.next',
        'coverage'
      ]
    },

    exclude: {
      // Completely exclude these files
      path: [
        '\\.spec\\.(js|ts|tsx)$',
        '\\.test\\.(js|ts|tsx)$',
        '__tests__',
        '__mocks__'
      ]
    },

    /**
     * MODULE SYSTEMS
     * Which import styles to recognize
     */
    moduleSystems: ['es6', 'cjs'],

    /**
     * TYPESCRIPT
     * Use tsconfig for path resolution
     */
    tsConfig: {
      fileName: './tsconfig.json'
    },

    /**
     * REPORTING
     */
    reporterOptions: {
      dot: {
        collapsePattern: '^(node_modules|packages)/[^/]+',
      },
      text: {
        highlightFocused: true
      }
    }
  }
};
