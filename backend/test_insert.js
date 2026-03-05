const db = require('./config/db');

(async () => {
    try {
        console.log('Testing Insert...');
        const res = await db.query(
            'INSERT INTO leave_types (name, is_paid, annual_limit) VALUES ($1, $2, $3) RETURNING *',
            ['TEST_LEAVE', true, 10]
        );
        console.log('Inserted:', res.rows[0]);
    } catch (e) {
        console.error('Insert Failed:', e);
    } finally {
        process.exit();
    }
})();
