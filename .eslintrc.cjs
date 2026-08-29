module.exports = {
  root: true,
  env: { es2021: true, node: true },
  extends: [
    "eslint:recommended",
    "plugin:vue/vue3-essential",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "vue-eslint-parser",
  parserOptions: {
    parser: "@typescript-eslint/parser",
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "vue/multi-word-component-names": "off",
  },
  ignorePatterns: ["dist/", "node_modules/", ".setup-cache/", ".superpowers/"],
};
