const { Client } = require('pg');
require('dotenv').config();

async function checkLahiruPayroll() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hr_db'
    });

    try {
        await client.connect();

        // Find Lahiru's user_id first
        const userRes = await client.query("SELECT id FROM users WHERE name ILIKE '%Lahiru%'");
        if (userRes.rows.length === 0) {
            console.log('Lahiru not found');
            return;
        }
        const userId = userRes.rows[0].id;

        // Check payroll records for Feb 2026
        const payrollRes = await client.query(`
            SELECT * FROM payroll 
            WHERE user_id = $1 AND month = '2026-02'
        `, [userId]);

        console.log('Payroll summary for Lahiru (Feb 2026):', payrollRes.rows);

        if (payrollRes.rows.length > 0) {
            const payrollId = payrollRes.rows[0].id;
            const detailsRes = await client.query(`
                SELECT * FROM payroll_details 
                WHERE payroll_id = $1 AND component_name ILIKE '%loan%'
            `, [payrollId]);
            console.log('Loan deductions in details:', detailsRes.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkLahiruPayroll();
