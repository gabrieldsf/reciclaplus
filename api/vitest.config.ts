import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup.ts'],
    // Os arquivos compartilham o mesmo banco de teste
    fileParallelism: false,
    hookTimeout: 120_000,
  },
})
