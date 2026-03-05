const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function analyzeDatabase() {
    console.log("=== STARTING DATABASE INTEGRITY ANALYSIS ===\n");
    let issuesFound = 0;

    try {
        // 1. Check Core Tables
        const coreTables = [
            'users', 'employees', 'roles', 'permissions', 'role_permissions',
            'employee_salary_structure', 'salary_components', 'payroll', 'leaves',
            'employee_loans' // checking the table we just added
        ];

        console.log("--- Checking Core Tables ---");
        const tablesRes = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        const existingTables = tablesRes.rows.map(r => r.table_name);

        coreTables.forEach(table => {
            if (existingTables.includes(table)) {
                console.log(`✅ Table '${table}' exists.`);
            } else {
                console.log(`❌ Table '${table}' is MISSING!`);
                issuesFound++;
            }
        });

        // 2. Check Critical Columns (Sample)
        if (existingTables.includes('users')) {
            console.log("\n--- Checking Users Table Columns ---");
            const userColsRes = await pool.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'users'
            `);
            const userCols = userColsRes.rows.map(r => r.column_name);
            const keyCols = ['email', 'password', 'role', 'profile_picture'];

            keyCols.forEach(col => {
                if (userCols.includes(col)) {
                    console.log(`✅ Column 'users.${col}' exists.`);
                } else {
                    console.log(`❌ Column 'users.${col}' is MISSING!`);
                    issuesFound++;
                }
            });
        }

        // 3. Check Default Data (Roles)
        if (existingTables.includes('roles')) {
            console.log("\n--- Checking Default Roles ---");
            const rolesRes = await pool.query("SELECT name FROM roles");
            const roles = rolesRes.rows.map(r => r.name);
            const defaultRoles = ['Admin', 'HR Manager', 'Employee']; // Assuming these are standard

            defaultRoles.forEach(role => {
                if (roles.includes(role)) {
                    console.log(`✅ Role '${role}' exists.`);
                } else {
                    console.log(`⚠️ Role '${role}' might be missing (or named differently).`);
                    // Not necessarily an error, just a warning
                }
            });
        }

        console.log(`\n=== ANALYSIS COMPLETE: ${issuesFound} issues found. ===`);

    } catch (err) {
        console.error("Analysis failed:", err);
    } finally {
        await pool.end();
    }
}

analyzeDatabase();
