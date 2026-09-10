import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  main: {
    // electron itself lives in devDependencies — include it explicitly or
    // Rollup bundles the npm launcher shim instead of the builtin module.
    plugins: [externalizeDepsPlugin({ include: ['electron'] })],
  },
  preload: {
    plugins: [externalizeDepsPlugin({ include: ['electron'] })],
    build: {
      // Sandboxed preloads may only require whitelisted builtins — never
      // sibling chunks — so each entry must be a fully standalone bundle.
      isolatedEntries: true,
      rollupOptions: {
        input: {
          editor: resolve(import.meta.dirname, 'src/preload/editor.ts'),
          teleprompter: resolve(import.meta.dirname, 'src/preload/teleprompter.ts'),
        },
        external: ['electron'],
        output: {
          // Sandboxed preload scripts must be CommonJS with a .js extension.
          format: 'cjs',
          entryFileNames: '[name].js',
        },
      },
    },
  },
  renderer: {
    plugins: [react(), tailwindcss()],
    build: {
      // Never inline ?url assets as data: URIs — AudioWorklet.addModule can
      // only load real same-origin files (pcm-worklet.js).
      assetsInlineLimit: 0,
      rollupOptions: {
        input: {
          editor: resolve(import.meta.dirname, 'src/renderer/editor.html'),
          teleprompter: resolve(import.meta.dirname, 'src/renderer/teleprompter.html'),
        },
      },
    },
  },
})
