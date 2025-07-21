import antfu from '@antfu/eslint-config'
import oxlint from 'eslint-plugin-oxlint'

export default antfu(
  {
    unocss: true,
    rules: {
      '@unocss/order': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'unused-imports/no-unused-vars': ['warn', { caughtErrors: 'none' }],
      'no-lone-blocks': 'off',
      'vue/no-mutating-props': ['error', {
        shallowOnly: true,
      }],
    },
  },
  {
    ignores: ['*.json', 'dist/**/*', 'dist-type/**/*'],
  },
  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
)
