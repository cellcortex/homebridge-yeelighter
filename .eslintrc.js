module.exports = {
  parser: "@typescript-eslint/parser", // Specifies the ESLint parser
  plugins: ["@typescript-eslint", "eslint-comments", "promise", "unicorn"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended", // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    "plugin:eslint-comments/recommended",
    "plugin:promise/recommended",
    "plugin:unicorn/recommended",
  ],
  parserOptions: {
    ecmaVersion: 12, // Allows for the parsing of modern ECMAScript features
    sourceType: "module" // Allows for the use of imports
  },
  env: {
    node: true,
    browser: false,
    jest: true,
    "es2021": true
  },
  rules: {
    // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "unicorn/expiring-todo-comments": "off"
  }
};
