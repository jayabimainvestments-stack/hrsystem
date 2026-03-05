const db = require('./config/db');

const searchUsers = async () => {
    const searchTerms = [
        'Lakshan',
        'Lakshika', // Checking similarity
        'Pradeep Warnasuriya',
        'Wimalasuriya',
        'W M A G D N',
        'Adhikarinayaka',
        'Adhikarinayake'
    ];

    try {
        console.log('Searching for users...');
        for (const term of searchTerms) {
            const res = await db.query("SELECT id, name, email FROM users WHERE name ILIKE $1", [`%${term}%`]);
            if (res.rows.length > 0) {
                console.log(`\nMatches for "${term}":`);
                console.table(res.rows);
            } else {
                console.log(`\nNo matches for "${term}"`);
            }
        }
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

searchUsers();
