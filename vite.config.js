import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: 'www',
    envDir: '../', 
    base: './',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'www/index.html'),
                feed: resolve(__dirname, 'www/feed.html'),
                list: resolve(__dirname, 'www/list.html'),
                profile: resolve(__dirname, 'www/profile.html'),
                settings: resolve(__dirname, 'www/settings.html')
            }
        }
    },
    envPrefix: 'VITE_',
});