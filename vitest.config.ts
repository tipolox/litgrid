import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const packagesRoot = fileURLToPath(new URL('./packages/', import.meta.url))

export default defineConfig({
  plugins: [{
    name: 'test-typescript-sources',
    enforce: 'pre',
    resolveId(source, importer) {
      // Historical generated .js files are checked in beside core sources.
      // Test the TypeScript implementation that package builds actually compile.
      if (importer && source.startsWith('.') && source.endsWith('.js')) {
        const candidate = resolve(dirname(importer), source.slice(0, -3) + '.ts')
        if (candidate.startsWith(packagesRoot) && !candidate.includes('node_modules') && existsSync(candidate)) return candidate
      }
    }
  }],
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
