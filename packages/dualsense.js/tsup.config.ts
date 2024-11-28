import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  sourcemap: true,
  clean: true,
  dts: true,
  treeshake: true,
  format: ['cjs', 'esm', 'iife'],
  name: 'dualsense.js',
  globalName: 'DualSense',
})
