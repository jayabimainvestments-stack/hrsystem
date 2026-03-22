const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const db = require('./backend/config/db');

async function fetchCurrentData() {
    const emails = [
        'KRISHANTHA@jayabima.com',
        'HASITHA@jayabima.com',
        'KANCHANA@jayabima.com',
        'LAHIRU@jayabima.com',
        'MAYURI@jayabima.com',
        'PRASANNA@jayabima.com'
    ];

    try {
        console.log("Fetching data for:", emails);
        
        const query = `
            SELECT 
                u.id as user_id,
                u.name,
                u.email,
                u.role,
                e.*
            FROM users u
            JOIN employees e ON u.id = e.user_id
            WHERE LOWER(u.email) IN (${emails.map(e => `'${e.toLowerCase()}'`).join(',')})
        `;

        const result = await db.query(query);
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error("Error fetching data:", error);
        process.exit(1);
    }
}

fetchCurrentData();
