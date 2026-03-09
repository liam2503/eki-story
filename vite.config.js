import { defineConfig } from "vite";
import path from "path";
import fs from "fs";

export default defineConfig({
    root: 'www',
    envDir: '../',
    base: './',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
    },
    envPrefix: 'VITE_',
    server: {
        fs: {
            allow: ['..'],
        },
    },
    plugins: [
        {
            name: 'dev-middleware',
            configureServer(server) {
                // Serve /docs/ from project-root/docs/
                server.middlewares.use('/docs', (req, res, next) => {
                    const filePath = path.resolve(__dirname, 'docs', req.url.replace(/^\//, ''));
                    if (fs.existsSync(filePath)) {
                        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                        fs.createReadStream(filePath).pipe(res);
                    } else {
                        next();
                    }
                });
                // Redirect / to /auth.html
                server.middlewares.use((req, res, next) => {
                    if (req.url === '/') {
                        res.writeHead(302, { Location: '/auth.html' });
                        res.end();
                        return;
                    }
                    next();
                });
            },
        },
    ],
});