import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Mocking the Vercel environment for api/status.js
// Since we can't easily import ESM into CJS in some Node versions without async import()
// we will load the file content and evaluate it or just use dynamic import.

const server = http.createServer(async (req, res) => {
    console.log(`${req.method} ${req.url}`);

    if (req.url.startsWith('/api/status')) {
        try {
            // Dynamic import to handle the ESM status.js
            const { default: handler } = await import('./api/status.js');

            const vRes = {
                setHeader: (name, value) => {
                    res.setHeader(name, value);
                },
                status: (code) => {
                    res.statusCode = code;
                    return vRes;
                },
                json: (data) => {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                }
            };

            await handler(req, vRes);
        } catch (error) {
            console.error('API Error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
        }
    } else {
        // Serve static files from public/
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const publicDir = path.resolve(__dirname, 'public');
        const rawPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
        const normalizedPath = path.normalize(rawPath).replace(/^(\.\.[/\\])+/, '');
        const safeRelativePath = normalizedPath.replace(/^[/\\]+/, '');
        const filePath = path.resolve(publicDir, safeRelativePath);

        if (!filePath.startsWith(`${publicDir}${path.sep}`) && filePath !== publicDir) {
            res.statusCode = 403;
            res.end('Forbidden');
            return;
        }

        if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
            const ext = path.extname(filePath);
            const contentTypes = {
                '.html': 'text/html',
                '.css': 'text/css',
                '.js': 'text/javascript'
            };
            res.setHeader('Content-Type', contentTypes[ext] || 'text/plain');
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.statusCode = 404;
            res.end('Not Found');
        }
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Test server running at http://localhost:${PORT}`);
});
