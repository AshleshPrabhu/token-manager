import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { resolve } from 'path'

export default defineConfig({
    plugins: [
        nodePolyfills({
            protocolImports: true,
        }),
    ],
    resolve: {
        alias: {
        // Add these if not already present
        buffer: 'buffer',
        process: 'process/browser',
        },
    },
    define: {
        // Optional but helps with some packages
        global: 'globalThis',
    },
    optimizeDeps: {
        include: ['buffer', 'process'],
    },
})
