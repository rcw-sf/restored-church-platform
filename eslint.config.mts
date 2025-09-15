import js from "@eslint/js";
import react from "eslint-plugin-react";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js, react },
    extends: ["js/recommended"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // modern React fixes
      "react/jsx-key": "error",
      "react/react-in-jsx-scope": "off",
      "react/display-name": "off",
    },
  },
  // Base JS rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,
]);
