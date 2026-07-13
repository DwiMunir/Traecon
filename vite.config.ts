import { defineConfig } from 'vitest/config'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'

export default defineConfig(({ mode }) => ({
  // crx dimatikan saat vitest (mode 'test') — test hanya menyentuh pipeline murni
  plugins: mode === 'test' ? [] : [crx({ manifest })],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}))
