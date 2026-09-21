import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'public']),
  {
    files: ['**/*.{js,jsx,mjs}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    plugins: {
      react,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // Mark JSX identifiers as used so unused component imports fail correctly
      'react/jsx-uses-vars': 'error',
      // Fail on unused vars/imports; allow intentionally unused _prefixed names
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // Hooks: keep recommended; exhaustive-deps as warn so CI can land without multi-day pure deps rewrites
      'react-hooks/exhaustive-deps': 'warn',
      // Allow shared context/export patterns
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Empty catch blocks used for storage/parse guards — allow empty
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
])
