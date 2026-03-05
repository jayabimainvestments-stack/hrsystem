const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function analyze() {
    try {
        // 1. Get Component ID
        const compRes = await pool.query("SELECT id, name FROM salary_components WHERE name ILIKE '%Fuel%'");
        console.log('--- Fuel Components ---');
        console.table(compRes.rows);
        const fuelComponentId = compRes.rows.find(c => c.name === 'Fuel Allowance')?.id || compRes.rows[0]?.id;

        if (!fuelComponentId) {
            console.error('Fuel Allowance component not found!');
            return;
        }

        // 2. Get Request Data for IDs 3 and 4
        const reqRes = await pool.query("SELECT id, status, data FROM financial_requests WHERE id IN (3, 4)");
        console.log('\n--- Impact Analysis for IDs 3 and 4 ---');

        for (const row of reqRes.rows) {
            console.log(`\nRequest ID: ${row.id}, Status: ${row.status}`);
            const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
            console.log(`Employees affected: ${data.length}`);

            // Check current status in employee_salary_structure
            const empIds = data.map(item => item.employee_id);
            const structRes = await pool.query(
                "SELECT count(*) as locked_count FROM employee_salary_structure WHERE component_id = $1 AND employee_id = ANY($2) AND is_locked = true",
                [fuelComponentId, empIds]
            );
            console.log(`Currently locked entries in salary structure: ${structRes.rows[0].locked_count}`);
        }

        console.log(`\nRECOMMENDED ACTIONS:`);
        console.log(`1. UPDATE employee_salary_structure SET amount = 0, is_locked = false, lock_reason = NULL WHERE component_id = ${fuelComponentId} AND employee_id IN (affected_ids)`);
        console.log(`2. DELETE FROM financial_requests WHERE id IN (3, 4, 5)`);

    } catch (e) {
        console.error('Error during analysis:', e);
    } finally {
        await pool.end();
    }
}

analyze();
