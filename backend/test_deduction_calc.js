const db = require('./config/db');
const axios = require('axios');

/**
 * Test Deduction Calculation
 * Calls the deduction calculation API and displays results
 */

async function testDeductionCalculation() {
    try {
        console.log("\n=== TESTING DEDUCTION CALCULATION FOR 2026-02 ===\n");

        // First, check if we have attendance data
        const attendanceCheck = await db.query(
            "SELECT COUNT(*) as count FROM attendance WHERE date >= '2026-02-01' AND date <= '2026-02-15'"
        );
        console.log(`📊 Attendance records found: ${attendanceCheck.rows[0].count}`);

        // Call the deduction calculation API
        console.log("\n🔄 Calling deduction calculation API...\n");

        const response = await axios.post('http://localhost:5000/api/deductions/calculate', {
            month: '2026-02'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log("✅ CALCULATION COMPLETE!\n");
        console.log("📋 Results:");
        console.log(`   Processed Employees: ${response.data.processed_employees}`);
        console.log(`   Total Deduction Value: LKR ${response.data.total_deduction_value.toFixed(2)}`);

        if (response.data.report && response.data.report.length > 0) {
            console.log("\n📊 Detailed Report:");
            console.table(response.data.report);
        } else {
            console.log("\n⚠️  No deductions calculated (all employees may have 0 Attendance Allowance)");
        }

        // Check the database to see what was updated
        console.log("\n🔍 Checking database for 'No Pay' deductions...");
        const deductionCheck = await db.query(`
            SELECT u.name, sc.name as component, ess.amount
            FROM employee_salary_structure ess
            JOIN employees e ON ess.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            JOIN salary_components sc ON ess.component_id = sc.id
            WHERE sc.name = 'No Pay'
            ORDER BY u.name
        `);

        if (deductionCheck.rows.length > 0) {
            console.log("\n💰 No Pay Deductions in Database:");
            console.table(deductionCheck.rows);
        } else {
            console.log("\n⚠️  No 'No Pay' deductions found in employee_salary_structure table");
        }

        process.exit();
    } catch (error) {
        console.error("\n❌ Error:", error.response?.data || error.message);
        process.exit(1);
    }
}

testDeductionCalculation();
