import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    nodePolyfills({
      include: ['buffer', 'events', 'assert'],
      globals: { Buffer: true },
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      '@midnight-ntwrk/compact-runtime': path.resolve(
        __dirname,
        'node_modules/@midnight-ntwrk/compact-runtime'
      ),
    },
    dedupe: [
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/ledger-v8',
    ],
  },
});
