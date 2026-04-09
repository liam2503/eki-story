import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(fs.readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version),
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
    }
  },
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