const fs = require('fs');
const path = require('path');
const db = require('./config/db');

async function debugUpload() {
    try {
        console.log('--- UPLOAD DIAGNOSTIC ---');
        console.log('Current CWD:', process.cwd());

        const uploadsPath = path.join(process.cwd(), 'uploads');
        console.log('Target Uploads Path:', uploadsPath);

        if (!fs.existsSync(uploadsPath)) {
            console.log('Uploads directory DOES NOT exist. Attempting creation...');
            fs.mkdirSync(uploadsPath, { recursive: true });
            console.log('Creation successful.');
        } else {
            console.log('Uploads directory exists.');
            // Test write permission
            const testFile = path.join(uploadsPath, 'test.txt');
            fs.writeFileSync(testFile, 'test');
            console.log('Write permission TEST: SUCCESS');
            fs.unlinkSync(testFile);
        }

        // Check DB connection
        const now = await db.query('SELECT NOW()');
        console.log('DB Connection TEST: SUCCESS', now.rows[0].now);

        // Check if users table has the column
        const columnCheck = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='profile_picture'");
        if (columnCheck.rows.length > 0) {
            console.log('Column "profile_picture" TEST: SUCCESS');
        } else {
            console.log('Column "profile_picture" TEST: FAILED (Column missing!)');
        }

        console.log('--- DIAGNOSTIC COMPLETE ---');
        process.exit(0);
    } catch (error) {
        console.error('DIAGNOSTIC FAILED:', error);
        process.exit(1);
    }
}

debugUpload();
