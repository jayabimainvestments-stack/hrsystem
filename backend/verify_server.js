const http = require('http');

function check(path, method) {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: path,
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        timeout: 2000
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => console.log(`${method} ${path} -> Status: ${res.statusCode}, Body: ${data.substring(0, 100)}...`));
    });

    req.on('error', (e) => {
        console.error(`${method} ${path} -> Error: ${e.message}`);
    });

    req.on('timeout', () => {
        req.destroy();
        console.error(`${method} ${path} -> Timeout`);
    });

    req.end();
}

console.log('Checking server routes...');
check('/api/deductions/test', 'GET');
check('/', 'GET');
