const db = require('./config/db');

async function checkUsers() {
    try {
        const res = await db.query('SELECT id, name, email, role, force_password_change, password FROM users');
        console.log('--- User List ---');
        res.rows.forEach(u => {
            console.log(`ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | Force Change: ${u.force_password_change}`);
            // We won't log the full password hash for privacy, just a snippet to check it exists
            console.log(`Password Hash Snippet: ${u.password ? u.password.substring(0, 10) + '...' : 'MISSING'}`);
        });
        console.log('-----------------');
    } catch (err) {
        console.error('Error checking users:', err);
    } finally {
        process.exit();
    }
}

checkUsers();
