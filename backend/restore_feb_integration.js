const db = require('./config/db');
require('dotenv').config();

const MONTH = '2026-02';

async function run() {
    try {
        console.log('Starting Final February Integration...');

        // 1. Expand Targets for Employee 28 (Hasitha) and 29 (Upuli)
        // Employee 28 has value 350,000 for Metric 1 (LOAN AMOUNT). Current target only goes to 200k.
        console.log('Expanding targets...');
        await db.query(`
            -- Metric 1 (LOAN AMOUNT) targets for Employee 28
            INSERT INTO employee_performance_targets (employee_id, metric_id, mark, min_value, max_value, is_descending)
            VALUES 
                (28, 1, 2, 200001, 400000, false),
                (28, 1, 3, 400001, 800000, false)
            ON CONFLICT (employee_id, metric_id, mark) DO UPDATE SET 
                min_value = EXCLUDED.min_value, 
                max_value = EXCLUDED.max_value;

            -- Metric 1 (LOAN AMOUNT) targets for Employee 29
            INSERT INTO employee_performance_targets (employee_id, metric_id, mark, min_value, max_value, is_descending)
            VALUES 
                (29, 1, 2, 100001, 300000, false)
            ON CONFLICT (employee_id, metric_id, mark) DO UPDATE SET 
                min_value = EXCLUDED.min_value, 
                max_value = EXCLUDED.max_value;
                
            -- Add DEFAULT (Metric 2) targets for 28 and 29 (similar to Employee 30)
            INSERT INTO employee_performance_targets (employee_id, metric_id, mark, min_value, max_value, is_descending)
            VALUES 
                (28, 2, 2, 1, 79999, false),
                (29, 2, 2, 1, 79999, false)
            ON CONFLICT (employee_id, metric_id, mark) DO NOTHING;
        `);

        // 2. Snapshot Master Salary Baseline to Monthly Overrides (as Draft)
        console.log('Snapshotting Baseline to Feb Overrides...');
        await db.query(`
            INSERT INTO monthly_salary_overrides (employee_id, month, component_id, amount, quantity, status, reason)
            SELECT ess.employee_id, $1, ess.component_id, ess.amount, ess.quantity, 'Draft', 'Master Baseline Snapshot'
            FROM employee_salary_structure ess
            JOIN employees e ON ess.employee_id = e.id
            WHERE e.employment_status = 'Active'
            ON CONFLICT (employee_id, month, component_id) 
            DO UPDATE SET 
                amount = EXCLUDED.amount, 
                quantity = EXCLUDED.quantity,
                status = 'Draft',
                reason = EXCLUDED.reason;
        `, [MONTH]);

        // 3. Reset February Performance Approvals to force re-calculation
        console.log('Resetting Feb Performance Approvals...');
        await db.query(`DELETE FROM performance_monthly_approvals WHERE month = $1`, [MONTH]);

        // 4. Clean up Performance Overrides in Feb to ensure fresh ones are created
        // (Identifying those created by 'Monthly Performance Marks')
        await db.query(`DELETE FROM monthly_salary_overrides WHERE month = $1 AND reason = 'Monthly Performance Marks'`, [MONTH]);

        console.log('Restoration complete. Please refresh the Performance Allowance and Governance Hub pages.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
