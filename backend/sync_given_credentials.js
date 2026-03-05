const db = require('./config/db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function syncCredentials() {
    try {
        console.log('--- Starting Credential Sync ---');
        await db.query('BEGIN');

        // 1. Sync Employees from bulk_employees.json
        const rawData = fs.readFileSync(path.join(__dirname, 'bulk_employees.json'));
        const employees = JSON.parse(rawData);

        for (const emp of employees) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(emp.password, salt);

            // Update user by email
            const result = await db.query(
                `UPDATE users 
                 SET password = $1, activation_token = NULL, activation_expires_at = NULL, force_password_change = FALSE 
                 WHERE email = $2 
                 RETURNING id, email`,
                [hashedPassword, emp.email]
            );

            if (result.rows.length > 0) {
                console.log(`✅ Synced: ${emp.email} (Password: ${emp.password})`);
            } else {
                console.log(`⚠️  User not found for email: ${emp.email}`);
            }
        }

        // 2. Update Admin (ADMINTA / USER)
        const adminSalt = await bcrypt.genSalt(10);
        const adminHashedPassword = await bcrypt.hash('USER', adminSalt);

        const adminResult = await db.query(
            `UPDATE users 
             SET email = 'ADMINTA', password = $1, activation_token = NULL, activation_expires_at = NULL, force_password_change = FALSE 
             WHERE id = 1 
             RETURNING id, email`,
            [adminHashedPassword]
        );

        if (adminResult.rows.length > 0) {
            console.log(`🚀 Admin updated: Username = ADMINTA, Password = USER`);
        } else {
            console.log(`❌ ERROR: Admin user (ID 1) not found!`);
        }

        await db.query('COMMIT');
        console.log('--- Sync Completed Successfully ---');
        process.exit(0);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('❌ Sync failed:', error);
        process.exit(1);
    }
}

syncCredentials();
