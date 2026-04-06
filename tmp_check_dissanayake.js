const db = require('./backend/config/db');

async function checkDissanayake() {
    try {
        console.log("Checking database schema for employees and payroll...");
        
        // Find employee Dissanayake
        const employees = await db.query(`
            SELECT e.id, u.name, e.user_id 
            FROM employees e 
            JOIN users u ON e.user_id = u.id 
            WHERE u.name ILIKE '%Dissanayake%'
        `);

        if (employees.rows.length === 0) {
            console.log("No employees found matching 'Dissanayake'.");
            // List all users to be sure
            const allUsers = await db.query("SELECT id, name FROM users LIMIT 10");
            console.log("Sample users:", allUsers.rows);
            return;
        }

        for (const emp of employees.rows) {
            console.log(`\n--- Data for ${emp.name} (Employee ID: ${emp.id}, User ID: ${emp.user_id}) ---`);
            
            // Check Attendance
            console.log("Attendance records for March 2026:");
            const attendance = await db.query(
                "SELECT date, status, clock_in, clock_out FROM attendance WHERE user_id = $1 AND date >= '2026-03-01' AND date <= '2026-03-31' ORDER BY date",
                [emp.user_id]
            );
            
            if (attendance.rows.length > 0) {
                console.table(attendance.rows.map(r => ({
                    date: r.date.toISOString().split('T')[0],
                    status: r.status,
                    clock_in: r.clock_in,
                    clock_out: r.clock_out
                })));
            } else {
                console.log("No attendance records found for March 2026.");
            }

            // Check Payroll
            console.log("Payroll record for March 2026:");
            const payroll = await db.query(
                "SELECT * FROM payroll WHERE user_id = $1 AND month = '2026-03'",
                [emp.user_id]
            );
            
            if (payroll.rows.length > 0) {
                console.table(payroll.rows);
            } else {
                console.log("No payroll record found for March 2026.");
            }

            // Check if there are any other specific tables for March 26-31
            // Maybe there are 'salary_advance' or 'fuel_allowance' records?
            console.log("Checking fuel_allowance and salary_advance for late March...");
            
            const fuel = await db.query(
                "SELECT * FROM fuel_allowance WHERE user_id = $1 AND allowance_date >= '2026-03-26'",
                [emp.user_id]
            ).catch(e => ({rows: []})); // Ignore if table doesn't exist

            if (fuel.rows.length > 0) {
                console.log("Fuel Allowances (March 26 onwards):");
                console.table(fuel.rows);
            }

            const advance = await db.query(
                "SELECT * FROM salary_advance WHERE user_id = $1 AND request_date >= '2026-03-26'",
                [emp.user_id]
            ).catch(e => ({rows: []}));

            if (advance.rows.length > 0) {
                console.log("Salary Advances (March 26 onwards):");
                console.table(advance.rows);
            }
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

checkDissanayake();
