const { closeServer, startServer } = require('../tools/serve');

// Starting the server inside Playwright's own process avoids a Windows process-
// tree teardown hang caused by the webServer shell wrapper. Returning cleanup
// is the supported Playwright global-setup contract.
module.exports = async function globalSetup() {
    let server;
    try {
        server = await startServer(8123);
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'EADDRINUSE') {
            return () => {};
        }
        throw error;
    }
    return () => closeServer(server);
};
