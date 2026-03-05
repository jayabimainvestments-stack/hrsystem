const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function investigate() {
    try {
        console.log('--- Finding Hasitha ---');
        const empRes = await pool.query(`
            SELECT e.id, u.name, u.email 
            FROM employees e 
            JOIN users u ON e.user_id = u.id 
            WHERE u.name ILIKE '%Hasitha%' OR u.email ILIKE '%Hasitha%'
        `);
        if (empRes.rows.length === 0) {
            console.log('Hasitha not found.');
        } else {
            const hasitha = empRes.rows[0];
            console.log(`Hasitha Found: ID ${hasitha.id}, Name: ${hasitha.name}, Email: ${hasitha.email}`);

            console.log('\n--- Hasitha Monthly Salary Overrides (Performance/Advances) ---');
            const overrideRes = await pool.query("SELECT mo.*, sc.name as component_name FROM monthly_salary_overrides mo JOIN salary_components sc ON mo.component_id = sc.id WHERE mo.employee_id = $1", [hasitha.id]);
            overrideRes.rows.forEach(row => {
                console.log(`ID: ${row.id}, Month: ${row.month}, Component: ${row.component_name} (ID: ${row.component_id}), Amount: ${row.amount}, Status: ${row.status}`);
            });

            console.log('\n--- Hasitha Financial Requests ---');
            // Join with users/employees to be sure
            const finRes = await pool.query(`
                SELECT fr.* 
                FROM financial_requests fr 
                JOIN users u ON fr.requested_by = u.id 
                JOIN employees e ON u.id = e.user_id 
                WHERE e.id = $1
            `, [hasitha.id]);
            finRes.rows.forEach(row => {
                console.log(`ID: ${row.id}, Month: ${row.month}, Type: ${row.type}, Amount: ${row.amount}, Status: ${row.status}, Data:`, JSON.stringify(row.data));
            });

            console.log('\n--- Hasitha Weekly Performance Data ---');
            // Check if table exists first or just try-catch
            try {
                const perfRes = await pool.query("SELECT * FROM performance_weekly_data WHERE employee_id = $1 ORDER BY week_ending DESC LIMIT 10", [hasitha.id]);
                perfRes.rows.forEach(row => {
                    console.log(`ID: ${row.id}, Week Ending: ${row.week_ending}, Score: ${row.performance_score}, Rate: ${row.rate}, Amount: ${row.amount}`);
                });
            } catch (e) {
                console.log('Error fetching performance_weekly_data:', e.message);
            }

            console.log('\n--- Hasitha Monthly Performance Approvals ---');
            try {
                const perfAppRes = await pool.query("SELECT * FROM performance_monthly_approvals WHERE employee_id = $1", [hasitha.id]);
                perfAppRes.rows.forEach(row => {
                    console.log(`ID: ${row.id}, Month: ${row.month}, Final Performance: ${row.final_performance_value}, Status: ${row.status}`);
                });
            } catch (e) {
                console.log('Error fetching performance_monthly_approvals:', e.message);
            }
        }

        console.log('\n--- General Salary Advance History (All employees) ---');
        const allAdvRes = await pool.query("SELECT * FROM financial_requests WHERE type ILIKE '%advance%' ORDER BY month DESC LIMIT 10");
        allAdvRes.rows.forEach(row => {
            console.log(`ID: ${row.id}, EmpID: ${row.employee_id}, Month: ${row.month}, Type: ${row.type}, Amount: ${row.amount}, Status: ${row.status}`);
        });

        console.log('\n--- Weekly Performance for All (Summed by month potentially) ---');
        try {
            const allPerfRes = await pool.query(`
                SELECT employee_id, SUM(amount) as total_amount 
                FROM performance_weekly_data 
                WHERE week_ending >= '2026-02-01' 
                GROUP BY employee_id
            `);
            console.log('Total Performance Amount for Feb 2026:', allPerfRes.rows);
        } catch (e) {
            console.log('Error calculating performance:', e.message);
        }

        console.log('\n--- Salary Components ---');
        const compRes = await pool.query("SELECT * FROM salary_components WHERE name ILIKE '%advance%' OR name ILIKE '%performance%'");
        compRes.rows.forEach(row => {
            console.log(`ID: ${row.id}, Name: ${row.name}, Type: ${row.type}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

investigate();
