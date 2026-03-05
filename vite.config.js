import { defineConfig } from "vite";

export default defineConfig({
    root: 'www',
    base: './',
    envDir: '../',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
    }
});