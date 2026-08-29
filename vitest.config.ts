import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@tipolox/litgrid-core': fileURLToPath(new URL('./packages/grid-core/src/index.ts', import.meta.url)),
      '@tipolox/litgrid-renderer': fileURLToPath(new URL('./packages/grid-renderer/src/index.ts', import.meta.url)),
      '@tipolox/litgrid-web': fileURLToPath(new URL('./packages/grid-web/src/index.ts', import.meta.url)),
      '@tipolox/litgrid-angular': fileURLToPath(new URL('./packages/grid-angular/src/index.ts', import.meta.url)),
      '@tipolox/litgrid-vue': fileURLToPath(new URL('./packages/grid-vue/src/index.ts', import.meta.url)),
      '@tipolox/litgrid-react': fileURLToPath(new URL('./packages/grid-react/src/index.ts', import.meta.url)),
      '@tipolox/litgrid-blazor': fileURLToPath(new URL('./packages/grid-blazor/src/index.ts', import.meta.url))
    }
  }

})
