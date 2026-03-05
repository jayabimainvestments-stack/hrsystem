const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        console.log('--- සාරාංශ වාර්තාව (Statutory Audit Report - Feb 2026) ---');

        const res = await pool.query(`
            SELECT u.name, e.id as emp_id,
                   p.epf_employee as epf_8, 
                   p.epf_employer as epf_12, 
                   p.etf_employer as etf_3, 
                   p.welfare as welfare_2
            FROM payroll p 
            JOIN users u ON p.user_id = u.id 
            JOIN employees e ON p.user_id = e.user_id
            WHERE p.month = '2026-02'
            ORDER BY u.name
        `);

        console.log('ගණනය කරන ලද සේවකයන් (Calculated Employees):');
        res.rows.forEach(r => {
            console.log(`- ${r.name} (Emp ID: ${r.emp_id})`);
            console.log(`  - EPF 8%: ${r.epf_8}, EPF 12%: ${r.epf_12}, ETF 3%: ${r.etf_3}, Welfare 2%: ${r.welfare_2}`);
        });

        const totals = res.rows.reduce((acc, r) => ({
            epf8: acc.epf8 + parseFloat(r.epf_8),
            epf12: acc.epf12 + parseFloat(r.epf_12),
            etf3: acc.etf3 + parseFloat(r.etf_3),
            welfare2: acc.welfare2 + parseFloat(r.welfare_2)
        }), { epf8: 0, epf12: 0, etf3: 0, welfare2: 0 });

        console.log('\nමුළු එකතුව (Total Amounts):');
        console.log(`- EPF 8%: LKR ${totals.epf8.toLocaleString()}`);
        console.log(`- EPF 12%: LKR ${totals.epf12.toLocaleString()}`);
        console.log(`- ETF 3%: LKR ${totals.etf3.toLocaleString()}`);
        console.log(`- Welfare 2%: LKR ${totals.welfare2.toLocaleString()}`);

        // Check if Mayuri is missing
        const mayuri = await pool.query("SELECT u.name FROM employees e JOIN users u ON e.user_id = u.id WHERE u.name ILIKE '%Mayuri%'");
        const hasMayuriPayroll = res.rows.some(r => r.name.includes('MAYURI'));
        if (!hasMayuriPayroll) {
            console.log(`\nසටහන (Note): ${mayuri.rows[0]?.name} ගේ වැටුප් වර්තාව (Payroll Record) තවමත් සකසා නැත. ඇය ඇතුළත් කළ පසු ඉහත එකතුවන් තවත් වැඩි වනු ඇත.`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();
