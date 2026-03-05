const db = require('./config/db');

async function fixComponent() {
    try {
        const result = await db.query("UPDATE salary_components SET name = 'No Pay' WHERE name = 'Late/Absence Deduction' RETURNING *");
        if (result.rowCount === 0) {
            // Create if not exists
            const createRes = await db.query("INSERT INTO salary_components (name, type, is_taxable) VALUES ('No Pay', 'Deduction', true) RETURNING *");
            console.log('Created No Pay component:', createRes.rows[0]);
        } else {
            console.log('Renamed to No Pay:', result.rows[0]);
        }
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

fixComponent();
