const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function analyzeRelationships() {
    console.log("=== STARTING DATA RELATIONSHIP ANALYSIS ===\n");
    let issuesFound = 0;

    try {
        // 1. Check for Users without Employee records (excluding Admin)
        console.log("--- Checking Users vs Employees ---");
        const orphanUsers = await pool.query(`
            SELECT u.id, u.name, u.role 
            FROM users u 
            LEFT JOIN employees e ON u.id = e.user_id 
            WHERE e.id IS NULL AND u.role != 'Admin'
        `);

        if (orphanUsers.rows.length > 0) {
            console.log(`⚠️  Found ${orphanUsers.rows.length} Users without Employee records:`);
            console.table(orphanUsers.rows);
            issuesFound++;
        } else {
            console.log("✅ All non-admin users have employee records.");
        }

        // 2. Check for Roles without Permissions
        console.log("\n--- Checking Role Permissions ---");
        const emptyRoles = await pool.query(`
            SELECT r.name 
            FROM roles r 
            LEFT JOIN role_permissions rp ON r.name = rp.role 
            WHERE rp.permission_id IS NULL
        `);

        if (emptyRoles.rows.length > 0) {
            console.log(`⚠️  Found ${emptyRoles.rows.length} Roles with NO permissions:`);
            console.table(emptyRoles.rows);
            issuesFound++;
        } else {
            console.log("✅ All roles have at least one permission.");
        }

        // 3. Check for Employees without Salary Structure
        console.log("\n--- Checking Employee Salary Structures ---");
        const noSalary = await pool.query(`
            SELECT e.id, u.name 
            FROM employees e 
            JOIN users u ON e.user_id = u.id
            LEFT JOIN employee_salary_structure ess ON e.id = ess.employee_id 
            WHERE ess.id IS NULL
        `);

        if (noSalary.rows.length > 0) {
            console.log(`⚠️  Found ${noSalary.rows.length} Employees without Salary Structure:`);
            // Only show first 5 to avoid clutter
            console.table(noSalary.rows.slice(0, 5));
            if (noSalary.rows.length > 5) console.log(`...and ${noSalary.rows.length - 5} more.`);
            issuesFound++;
        } else {
            console.log("✅ All employees have salary structures.");
        }

        // 4. Check for Employees without Leave Balances
        console.log("\n--- Checking Employee Leave Balances ---");
        const noLeave = await pool.query(`
            SELECT e.id, u.name 
            FROM employees e 
            JOIN users u ON e.user_id = u.id
            LEFT JOIN leave_balances lb ON e.user_id = lb.user_id 
            WHERE lb.id IS NULL
        `);

        if (noLeave.rows.length > 0) {
            console.log(`⚠️  Found ${noLeave.rows.length} Employees without Leave Balances:`);
            console.table(noLeave.rows.slice(0, 5));
            if (noLeave.rows.length > 5) console.log(`...and ${noLeave.rows.length - 5} more.`);
            issuesFound++;
        } else {
            console.log("✅ All employees have leave balances.");
        }

        console.log(`\n=== RELATIONSHIP ANALYSIS COMPLETE: ${issuesFound} issues found. ===`);

    } catch (err) {
        console.error("Analysis failed:", err);
    } finally {
        await pool.end();
    }
}

analyzeRelationships();
