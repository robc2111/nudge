// eslint.config.js (ESLint v9+ flat config)
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  // ignore build artefacts
  { ignores: ['**/dist/**', '**/build/**', '**/node_modules/**', '**/.next/**'] },

  // --- Server (Node) ---
  {
    files: ['server/**/*.{js,cjs,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },

  // --- Client (React/Browser) ---
  {
    files: ['client/src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // allow Vite import.meta
        'import.meta': 'readonly',
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Vite/React 17+ doesn’t need React in scope
      'react/react-in-jsx-scope': 'off',
      // Optional niceties:
      'react/prop-types': 'off',
    },
    settings: { react: { version: 'detect' } },
  },
];