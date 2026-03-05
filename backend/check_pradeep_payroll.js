const { Client } = require('pg');
require('dotenv').config();

async function checkPradeepPayroll() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hr_db'
    });

    try {
        await client.connect();

        // Find Pradeep's user_id
        const userRes = await client.query("SELECT id FROM users WHERE name ILIKE '%Pradeep%'");
        if (userRes.rows.length === 0) {
            console.log('Pradeep not found');
            return;
        }
        const userId = userRes.rows[0].id;

        // Check payroll records for Feb 2026
        const payrollRes = await client.query(`
            SELECT * FROM payroll 
            WHERE user_id = $1 AND month = '2026-02'
        `, [userId]);

        console.log('Payroll summary for Pradeep (Feb 2026):', payrollRes.rows);

        if (payrollRes.rows.length > 0) {
            const payrollId = payrollRes.rows[0].id;
            const detailsRes = await client.query(`
                SELECT * FROM payroll_details 
                WHERE payroll_id = $1 AND component_name ILIKE '%fuel%'
            `, [payrollId]);
            console.log('Fuel allowance in details:', detailsRes.rows);
        }

        // Check overrides
        const overrideRes = await client.query(`
            SELECT mso.*, sc.name as component_name 
            FROM monthly_salary_overrides mso
            JOIN salary_components sc ON mso.component_id = sc.id
            WHERE mso.employee_id = 32 AND mso.month = '2026-02' AND sc.name ILIKE '%fuel%'
        `);
        console.log('Fuel overrides for Pradeep (Feb 2026):', overrideRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkPradeepPayroll();
