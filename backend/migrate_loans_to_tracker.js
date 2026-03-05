const db = require('./config/db');

async function migrateLoans() {
    try {
        console.log('--- MIGRATING STRUCTURE LOANS TO TRACKER ---');

        // 1. Find all active loan installments in salary structure
        const res = await db.query(`
            SELECT ess.*, u.name as employee_name, sc.name as component_name, e.user_id
            FROM employee_salary_structure ess
            JOIN salary_components sc ON ess.component_id = sc.id
            JOIN employees e ON ess.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            WHERE sc.name ILIKE '%loan%' AND ess.amount > 0
        `);

        if (res.rows.length === 0) {
            console.log('No structure loans found to migrate.');
            process.exit(0);
        }

        const adminIdRes = await db.query("SELECT id FROM users WHERE role = 'Admin' ORDER BY id LIMIT 1");
        const adminId = adminIdRes.rows[0]?.id || 16;

        for (const row of res.rows) {
            // Check if already in tracker to avoid duplicates
            const check = await db.query("SELECT id FROM employee_loans WHERE employee_id = $1 AND installment_amount = $2 AND status = 'Approved'", [row.employee_id, row.amount]);

            if (check.rows.length > 0) {
                console.log(`Loan for ${row.employee_name} already exists in tracker. Skipping.`);
                continue;
            }

            // Insert into tracker
            // We estimate total amount based on remaining installments (approximation)
            const remaining = parseInt(row.installments_remaining) || 1;
            const installmentAmount = parseFloat(row.amount);
            const totalAmount = installmentAmount * remaining;

            const now = new Date();
            const startDate = now.toISOString().split('T')[0];
            const end = new Date();
            end.setMonth(end.getMonth() + remaining);
            const endDate = end.toISOString().split('T')[0];

            await db.query(`
                INSERT INTO employee_loans 
                (employee_id, loan_date, total_amount, installment_amount, num_installments, installments_paid, start_date, end_date, requested_by, status, reason)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Approved', 'Migrated from older salary structure system')
            `, [row.employee_id, startDate, totalAmount, installmentAmount, remaining, 0, startDate, endDate, adminId]);

            console.log(`✅ Migrated loan for ${row.employee_name}: LKR ${totalAmount} (${remaining} installments)`);
        }

        console.log('--- MIGRATION COMPLETE ---');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateLoans();
