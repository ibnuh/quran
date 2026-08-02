import js from '@eslint/js'
import vue from 'eslint-plugin-vue'

export default [
  {
    ignores: [
      'dist/**',
      'dev-dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'obscura'
    ]
  },
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        Audio: 'readonly',
        MediaMetadata: 'readonly',
        URLSearchParams: 'readonly',
        AbortController: 'readonly',
        ResizeObserver: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        CustomEvent: 'readonly',
        console: 'readonly',
        __APP_VERSION__: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      curly: ['error', 'all'],
      // Formatting is owned by Prettier; disable layout rules to avoid conflicts
      // and churn against the existing hand-tuned (whitespace-sensitive) templates.
      'vue/html-indent': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/html-closing-bracket-spacing': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/attributes-order': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/attribute-hyphenation': 'off',
      'vue/v-on-event-hyphenation': 'off',
      // Modals are mounted/unmounted by a parent v-if and use an inner Transition
      // for styling, so the toggle lives on the component, not the transition child.
      'vue/require-toggle-inside-transition': 'off'
    }
  },
  {
    files: ['e2e/**/*.js', 'scripts/**/*.{js,mjs,cjs}', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly'
      }
    }
  },
  {
    files: [
      '*.config.js',
      'vite.config.js',
      'vitest.config.js',
      'playwright.config.js',
      'eslint.config.js'
    ],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        setInterval: 'readonly'
      }
    }
  }
]
