import js from "@eslint/js";
import typescriptParser from "@typescript-eslint/parser";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "*.config.mjs",
      "*.config.js",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        React: "readonly", // React is auto-imported in Next.js
      },
    },
    plugins: {
      "@typescript-eslint": typescriptPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "@next/next": nextPlugin,
    },
    rules: {
      // Error Prevention - Catch real bugs
      "no-await-in-loop": "error",
      "no-constant-binary-expression": "error",
      "no-constructor-return": "error",
      "no-promise-executor-return": "error",
      "no-self-compare": "error",
      "no-template-curly-in-string": "error",
      "no-unmodified-loop-condition": "error",
      "no-unreachable-loop": "error",
      "no-unused-private-class-members": "error",
      "require-atomic-updates": "error",

      // Best Practices - Prevent common mistakes
      "array-callback-return": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-return-await": "error",
      "no-throw-literal": "error",
      "prefer-promise-reject-errors": "error",
      "require-await": "warn",
      "no-unused-vars": "off", // Turn off base rule in favor of TypeScript version
      "no-undef": "off", // TypeScript handles this better

      // TypeScript - Effective rules without noise
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_|^React$",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // React/Next.js - Prevent issues
      "react/jsx-no-target-blank": ["error", { enforceDynamicLinks: "always" }],
      "react/no-array-index-key": "warn",
      "react/no-danger": "warn",
      "react/jsx-key": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Security
      "no-eval": "error",
      "no-new-func": "error",
      "no-implied-eval": "error",

      // Disable noisy/stylistic rules
      "react/display-name": "off",
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off", // Not needed in Next.js
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];
