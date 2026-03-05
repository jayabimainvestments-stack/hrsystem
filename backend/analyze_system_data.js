const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function analyzeSystemData() {
    console.log("=== STARTING SYSTEM DATA ANALYSIS ===\n");
    let issuesFound = 0;

    try {
        // 1. Check Leave Types
        console.log("--- Checking Leave Types ---");
        const leaveTypes = await pool.query("SELECT * FROM leave_types");
        if (leaveTypes.rows.length === 0) {
            console.log("❌ No Leave Types found! (e.g., Casual, Medical)");
            issuesFound++;
        } else {
            console.log(`✅ Found ${leaveTypes.rows.length} Leave Types.`);
        }

        // 2. Check Salary Components
        console.log("\n--- Checking Salary Components ---");
        const salaryComps = await pool.query("SELECT * FROM salary_components");
        if (salaryComps.rows.length === 0) {
            console.log("❌ No Salary Components found! (e.g., Basic Salary, Transport)");
            issuesFound++;
        } else {
            console.log(`✅ Found ${salaryComps.rows.length} Salary Components.`);
        }

        // 3. Check Departments
        console.log("\n--- Checking Departments ---");
        const depts = await pool.query("SELECT * FROM departments");
        if (depts.rows.length === 0) {
            console.log("⚠️  No Departments found.");
            // Not critical but good to know
        } else {
            console.log(`✅ Found ${depts.rows.length} Departments.`);
        }

        // 4. Check Designations
        console.log("\n--- Checking Designations ---");
        const desigs = await pool.query("SELECT * FROM designations");
        if (desigs.rows.length === 0) {
            console.log("⚠️  No Designations found.");
        } else {
            console.log(`✅ Found ${desigs.rows.length} Designations.`);
        }

        console.log(`\n=== SYSTEM DATA ANALYSIS COMPLETE: ${issuesFound} issues found. ===`);

    } catch (err) {
        console.error("Analysis failed:", err);
    } finally {
        await pool.end();
    }
}

analyzeSystemData();
