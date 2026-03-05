const db = require('./config/db');

async function fixMissingProfiles() {
    try {
        console.log('--- Checking for users without matching employee profiles ---');

        const usersRes = await db.query(`
            SELECT u.id, u.name, u.email, u.role 
            FROM users u 
            LEFT JOIN employees e ON u.id = e.user_id 
            WHERE e.id IS NULL
        `);

        if (usersRes.rows.length === 0) {
            console.log('All users already have employee profiles.');
            process.exit(0);
        }

        console.log(`Found ${usersRes.rows.length} users missing profiles. Creating stubs...`);

        for (const user of usersRes.rows) {
            console.log(`Processing: ${user.name} (${user.role})`);

            // Create a stub profile
            // We'll use a placeholder NIC if none available, or leave null if schema allows
            // Schema allows NIC to be null (UNIQUE though)
            await db.query(`
                INSERT INTO employees (user_id, designation, department, employment_status)
                VALUES ($1, $2, $3, 'Active')
            `, [
                user.id,
                user.role === 'Admin' ? 'System Administrator' : (user.role === 'HR Manager' ? 'HR Manager' : 'Staff'),
                user.role === 'Admin' ? 'Management' : (user.role === 'HR Manager' ? 'Human Resources' : 'General')
            ]);

            console.log(`Created stub profile for ${user.name}`);
        }

        console.log('--- Fix completed successfully ---');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing missing profiles:', error);
        process.exit(1);
    }
}

fixMissingProfiles();
