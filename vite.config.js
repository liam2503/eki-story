import { defineConfig } from "vite";

export default defineConfig({
    root: 'www',
    envDir: '../', 
    base: './',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
    },
    envPrefix: 'VITE_',
});