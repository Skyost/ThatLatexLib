import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin"

/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  {languageOptions: {globals: globals.node}},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  stylistic.configs["disable-legacy"],
  stylistic.configs.customize({
    indent: 2,
    quotes: "single",
    semi: false,
    commaDangle: "never",
    jsx: true
  })
];
