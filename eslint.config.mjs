import antfu from '@antfu/eslint-config'

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
)
