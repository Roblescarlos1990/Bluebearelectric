export default [
  {
    ignores: [
      'node_modules/**',
      '.npm-cache/**',
      'docs/archive/**',
      'docs/releases/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  {
    files: ['api/**/*.js', 'assets/js/**/*.js', 'scripts/**/*.mjs', 'tests/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-constant-binary-expression': 'error',
      'no-dupe-else-if': 'error',
      'no-new-native-nonconstructor': 'error',
      'no-promise-executor-return': 'error',
      'no-self-assign': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-unused-private-class-members': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
    },
  },
];
