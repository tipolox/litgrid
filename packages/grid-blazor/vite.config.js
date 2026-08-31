import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'LitGridBlazor',
      fileName: () => 'litgrid-blazor.js',
      formats: ['es']
    },
    outDir: resolve(__dirname, 'src/wwwroot'),
    emptyOutDir: false,
    sourcemap: true,
    minify: false
  }
})
