import typescriptEslint from "@typescript-eslint/eslint-plugin";
import eslintComments from "eslint-plugin-eslint-comments";
import promise from "eslint-plugin-promise";
import unicorn from "eslint-plugin-unicorn";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default [
  {
    ignores: ["**/node_modules", "**/dist", "**/build"]
  },
  ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:eslint-comments/recommended",
    "plugin:promise/recommended",
    "plugin:unicorn/recommended"
  ),
  {
    plugins: {
      "@typescript-eslint": typescriptEslint,
      "eslint-comments": eslintComments,
      promise,
      unicorn
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 12,
      sourceType: "module"
    },

    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "unicorn/expiring-todo-comments": "off",
      "unicorn/prefer-event-target": "off"
    }
  }
];
