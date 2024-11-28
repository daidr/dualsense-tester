import antfu from '@antfu/eslint-config'

export default antfu(
  {
    unocss: true,
    rules: {
      '@unocss/order': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
)
