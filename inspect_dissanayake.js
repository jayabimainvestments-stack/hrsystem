const db = require('./backend/config/db');

async function checkDissanayakeData() {
    try {
        console.log("Searching for 'Dissanayake'...");
        const usersRes = await db.query("SELECT id, name FROM users WHERE name ILIKE '%Dissanayake%' OR name ILIKE '%Dissnayake%'");
        const users = usersRes.rows;

        if (users.length === 0) {
            console.log("No users found.");
            return;
        }

        for (const user of users) {
            console.log(`\n\n--- [User: ${user.name} (ID: ${user.id})] ---`);
            
            // Get Employee ID
            const empRes = await db.query("SELECT id FROM employees WHERE user_id = $1", [user.id]);
            const empId = empRes.rows[0]?.id;
            console.log(`Employee ID: ${empId || 'N/A'}`);

            // 1. Attendance for March 26-31
            console.log("\n1. Attendance records (March 26-31, 2026):");
            const attendance = await db.query(
                "SELECT date, status, clock_in, clock_out FROM attendance WHERE date >= '2026-03-26' AND date <= '2026-03-31' AND employee_id = $1 ORDER BY date",
                [empId]
            );
            if (attendance.rows.length > 0) {
                console.table(attendance.rows.map(r => ({
                    date: r.date.toISOString().split('T')[0],
                    status: r.status,
                    clock_in: r.clock_in,
                    clock_out: r.clock_out
                })));
            } else {
                console.log("None found.");
            }

            // 2. Payroll for March 2026
            console.log("\n2. Payroll record (March 2026):");
            const payroll = await db.query(
                "SELECT * FROM payroll WHERE month = '2026-03' AND user_id = $1",
                [user.id]
            );
            if (payroll.rows.length > 0) {
                console.table(payroll.rows);
            } else {
                console.log("None found.");
            }

            // 3. Welfare Ledger or Fuel for March 26-31
            console.log("\n3. Welfare/Fuel records (March 26-31):");
            // Check if fuel_allowance table exists
            try {
                const fuel = await db.query(
                    "SELECT allowance_date, amount, status FROM fuel_allowance WHERE user_id = $1 AND allowance_date >= '2026-03-26' AND allowance_date <= '2026-03-31'",
                    [user.id]
                );
                if (fuel.rows.length > 0) {
                    console.log("Fuel Allowances:");
                    console.table(fuel.rows);
                }
            } catch (e) {
                console.log("Fuel allowance check failed (maybe table missing).");
            }

            try {
                const welfare = await db.query(
                    "SELECT amount, description, created_at FROM welfare_ledger WHERE user_id = $1 AND created_at >= '2026-03-26' AND created_at < '2026-04-01'",
                    [user.id]
                );
                if (welfare.rows.length > 0) {
                    console.log("Welfare Ledger Records:");
                    console.table(welfare.rows);
                }
            } catch (e) {
                console.log("Welfare ledger check failed.");
            }
        }

    } catch (err) {
        console.error("Critical Error:", err);
    } finally {
        process.exit();
    }
}

checkDissanayakeData();
