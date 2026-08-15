import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

const root = import.meta.dirname

// Ein Build für alle drei Einstiegspunkte:
//  - panel.html   -> Side-Panel UI (Svelte)
//  - background   -> MV3 Service Worker (ESM)
//  - content      -> Content-Script (klassisches Skript ohne import/export)
export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        panel: resolve(root, 'panel.html'),
        background: resolve(root, 'src/background/index.ts'),
        content: resolve(root, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background' || chunk.name === 'content') return 'js/[name].js'
          return 'assets/[name]-[hash].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
