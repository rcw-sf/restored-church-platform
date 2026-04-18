import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  // ✅ Global ignores (VERY IMPORTANT)
  {
    ignores: [
      "**/node_modules",
      "**/dist",
      "**/build",
      "**/coverage",
      "**/.firebase",
      "**/*.config.js",
    ],
  },

  // ✅ Base JavaScript recommended rules
  js.configs.recommended,

  // ✅ TypeScript (non type-aware for speed)
  ...tseslint.configs.recommended,

  // ✅ App/source files
  {
    files: ["**/*.{js,jsx,ts,tsx}"],

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },

    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },

    settings: {
      react: {
        version: "detect",
      },
    },

    rules: {
      // 🔹 React
      "react/jsx-key": "error",
      "react/react-in-jsx-scope": "off",
      "react/display-name": "off",

      // 🔹 React Hooks (important)
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // 🔹 React Refresh (Vite safety)
      "react-refresh/only-export-components": "warn",
    },
  },
]);
