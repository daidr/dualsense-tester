import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'modules',
    lib: {
      entry: './src/index.ts',
      name: 'DualSense',
      fileName: (format) => {
        return `${format}/dualsense.js`
      },
      formats: ['es', 'umd', 'cjs'],
    },
  },
})
