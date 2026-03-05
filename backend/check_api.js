const http = require('http');

function check(path) {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: path,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log(`GET ${path} -> Status: ${res.statusCode}`);
            if (res.statusCode === 200) {
                console.log("Body:", data);
            } else {
                console.log("Error Body:", data);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Error: ${e.message}`);
    });

    req.end();
}

check('/api/payroll-settings/structure/2');
