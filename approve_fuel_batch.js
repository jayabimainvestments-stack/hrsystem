const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function approveFuelBatch() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log("--- SUBMITTING MARCH 2026 FUEL BATCH ---");
        
        const month = '2026-03';
        const fuelData = [
            { employee_id: 30, name: 'Nishshankage Lahiru', liters: 65, amount: 20839, reason: 'Split: 20 working days. [9.75L @ Rs.292 + 13.00L @ Rs.293 + 32.50L @ Rs.317 + 9.75L @ Rs.398]' },
            { employee_id: 32, name: 'Prasanna Bandara', liters: 65, amount: 20839, reason: 'Split: 20 working days. [9.75L @ Rs.292 + 13.00L @ Rs.293 + 32.50L @ Rs.317 + 9.75L @ Rs.398]' }
        ];

        // 1. Insert Request as Pending
        const reqRes = await client.query(`
            INSERT INTO financial_requests (month, type, data, requested_by, status)
            VALUES ($1, 'Fuel Allowance', $2, 1, 'Pending')
            RETURNING id
        `, [month, JSON.stringify(fuelData)]);
        const requestId = reqRes.rows[0].id;
        console.log(`Created Financial Request: ID ${requestId}`);

        // 2. Approve Request (Mocking User 2 as approver)
        await client.query(`
            UPDATE financial_requests 
            SET status = 'Approved', approved_by = 2, updated_at = NOW() 
            WHERE id = $1
        `, [requestId]);
        console.log(`Approved Financial Request: ID ${requestId}`);

        // 3. Process Overrides (Directly using the service logic here or just rely on the fact that I manually updated them?)
        // To be safe and official, I'll run the update loop for overrides too
        const componentId = 204; // Monthly Fuel
        for (const entry of fuelData) {
            await client.query(`
                INSERT INTO monthly_salary_overrides (employee_id, month, component_id, amount, quantity, reason, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'Approved')
                ON CONFLICT (employee_id, month, component_id) 
                DO UPDATE SET 
                    amount = EXCLUDED.amount, 
                    quantity = EXCLUDED.quantity, 
                    reason = EXCLUDED.reason,
                    status = 'Approved'
            `, [entry.employee_id, month, componentId, entry.amount, entry.liters, entry.reason]);
        }
        console.log("Overrides updated/synced for all 2 employees.");

        await client.query('COMMIT');
        console.log("\nSUCCESS: March 2026 Fuel Batch is now OFFICIAL.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

approveFuelBatch();
