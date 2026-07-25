// Zero-dependency static server for local development and Playwright.
// ES modules don't load over file://, so run this and open http://localhost:8123/
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const port = Number(process.env.PORT) || 8123;

const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.md': 'text/plain; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const file = path.normalize(path.join(root, urlPath));
    if (!file.startsWith(root)) {
        res.writeHead(403);
        res.end('forbidden');
        return;
    }
    fs.readFile(file, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream' });
        res.end(data);
    });
}).listen(port, () => console.log(`Little Learner Keys on http://localhost:${port}/`));
