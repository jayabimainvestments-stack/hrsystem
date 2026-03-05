const net = require('net');

const checkPort = (port, name) => {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);
        socket.on('connect', () => {
            console.log(`[SUCCESS] ${name} is running on port ${port}`);
            socket.destroy();
            resolve(true);
        });
        socket.on('timeout', () => {
            console.log(`[ERROR] ${name} on port ${port}: Connection Timed Out`);
            socket.destroy();
            resolve(false);
        });
        socket.on('error', (err) => {
            console.log(`[ERROR] ${name} on port ${port}: ${err.message}`);
            resolve(false);
        });
        socket.connect(port, '127.0.0.1');
    });
};

const runChecks = async () => {
    console.log("Running System Diagnostics...");
    const backend = await checkPort(5000, "Backend API");
    const frontend = await checkPort(5173, "Frontend App"); // Back to 5173

    if (backend && frontend) {
        console.log("\nALL SYSTEMS GO! Both servers are running.");
    } else {
        console.log("\nSYSTEM FAILURE: One or more servers are not reachable.");
    }
    process.exit(0);
};

runChecks();
