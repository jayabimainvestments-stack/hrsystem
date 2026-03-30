const db = require('./backend/config/db');

async function test() {
    try {
        const res = await db.pool.query(`
            SELECT p.id, u.name, p.basic_salary, p.epf_employee, p.epf_employer, p.etf_employer, p.welfare
            FROM payroll p
            JOIN users u ON p.user_id = u.id
            WHERE p.month LIKE '2026-03%'
            LIMIT 5
        `);
        console.log(JSON.stringify(res.rows, null, 2));

        const wl = await db.pool.query(`
            SELECT ref_id, count(*) as c, sum(amount) as s 
            FROM welfare_ledger 
            GROUP BY ref_id HAVING count(*) > 1
        `);
        console.log("Duplicate Welfare records:", wl.rows);
    } catch (error) {
        console.error("DB Error:", error);
    } finally {
        await db.pool.end();
        process.exit();
    }
}

test();
