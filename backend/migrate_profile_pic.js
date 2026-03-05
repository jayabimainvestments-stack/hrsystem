const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

async function updateSchema() {
    try {
        console.log('Adding profile_picture column to users table...');
        await db.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS profile_picture TEXT;
        `);
        console.log('Successfully updated users table.');

        console.log('Bootstrapping admin profile picture...');
        // Using a professional placeholder for admin
        const adminPic = 'https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff&size=512';
        await db.query(`
            UPDATE users 
            SET profile_picture = $1 
            WHERE role = 'Admin' AND profile_picture IS NULL
        `, [adminPic]);
        console.log('Successfully bootstrapped admin profile picture.');

        process.exit(0);
    } catch (error) {
        console.error('Error updating schema:', error);
        process.exit(1);
    }
}

updateSchema();
