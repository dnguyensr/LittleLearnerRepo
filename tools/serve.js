// Zero-dependency static server for local development and Playwright.
// ES modules don't load over file://, so run this and open http://localhost:8123/
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const defaultPort = Number(process.env.PORT) || 8123;

const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.md': 'text/plain; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.ogg': 'audio/ogg',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav'
};

function createStaticServer() {
    return http.createServer((req, res) => {
        let urlPath = decodeURIComponent(req.url.split('?')[0]);
        if (urlPath.endsWith('/')) urlPath += 'index.html';
        const file = path.normalize(path.join(root, urlPath));
        const relative = path.relative(root, file);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
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
            res.writeHead(200, {
                'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream'
            });
            res.end(data);
        });
    });
}

function startServer(port = defaultPort) {
    const server = createStaticServer();
    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, () => {
            server.removeListener('error', reject);
            resolve(server);
        });
    });
}

function closeServer(server) {
    return new Promise(resolve => {
        server.close(resolve);
        server.closeAllConnections?.();
    });
}

if (require.main === module) {
    startServer().then(server => {
        console.log(`Edamame on http://localhost:${defaultPort}/`);
        let closing = false;
        const shutdown = () => {
            if (closing) return;
            closing = true;
            closeServer(server).then(() => process.exit(0));
            const forceExit = setTimeout(() => process.exit(1), 2000);
            forceExit.unref();
        };
        for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
            process.once(signal, shutdown);
        }
    }).catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = { closeServer, createStaticServer, startServer };
