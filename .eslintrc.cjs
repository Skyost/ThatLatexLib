module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    parser: '@typescript-eslint/parser',
    sourceType: 'module'
  },
  plugins: [
    '@typescript-eslint'
  ],
  rules: {
    'vue/no-v-html': 'off',
    'vue/multi-word-component-names': 'off',
    'vue/singleline-html-element-content-newline': 'off',
    'import/first': 'off'
  }
}
