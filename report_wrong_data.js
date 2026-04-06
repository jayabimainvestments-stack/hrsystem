const db = require('./backend/config/db');

async function getWrongData() {
    try {
        const userId = 36; // Dissanayake
        const empId = 27;

        console.log(`--- Checking 'Wrong' Data for Dissanayake (User ID: ${userId}) ---`);
        console.log("Period: 2026-03-26 to 2026-03-31\n");

        // 1. Attendance
        const att = await db.query(
            "SELECT id, date, clock_in, clock_out, status FROM attendance WHERE employee_id = $1 AND date >= '2026-03-26' AND date <= '2026-03-31' ORDER BY date",
            [empId]
        );
        console.log("1. Attendance (March 26-31):");
        if (att.rows.length > 0) {
            console.table(att.rows.map(r => ({
                id: r.id,
                date: r.date.toISOString().split('T')[0],
                status: r.status,
                clock_in: r.clock_in,
                clock_out: r.clock_out
            })));
        } else {
            console.log("No attendance records found.");
        }

        // 2. Fuel Allowance
        try {
            const fuel = await db.query(
                "SELECT id, allowance_date, amount, status FROM fuel_allowance WHERE user_id = $1 AND allowance_date >= '2026-03-26' AND allowance_date <= '2026-03-31'",
                [userId]
            );
            console.log("\n2. Fuel Allowance (March 26-31):");
            if (fuel.rows.length > 0) {
                console.table(fuel.rows);
            } else {
                console.log("No fuel allowance records found.");
            }
        } catch (e) {
            console.log("Fuel allowance table not accessible.");
        }

        // 3. Salary Advance
        try {
            const advance = await db.query(
                "SELECT id, request_date, amount, status FROM salary_advance WHERE user_id = $1 AND request_date >= '2026-03-26' AND request_date <= '2026-03-31'",
                [userId]
            );
            console.log("\n3. Salary Advance (March 26-31):");
            if (advance.rows.length > 0) {
                console.table(advance.rows);
            } else {
                console.log("No salary advance records found.");
            }
        } catch (e) {
            console.log("Salary advance table not accessible.");
        }

        // 4. Welfare Ledger
        try {
            const welfare = await db.query(
                "SELECT id, amount, description, created_at FROM welfare_ledger WHERE user_id = $1 AND created_at >= '2026-03-26' AND created_at < '2026-04-01'",
                [userId]
            );
            console.log("\n4. Welfare Ledger (March 26-31):");
            if (welfare.rows.length > 0) {
                console.table(welfare.rows);
            } else {
                console.log("No welfare ledger records found.");
            }
        } catch (e) {
            console.log("Welfare ledger table not accessible.");
        }

        // 5. March Payroll record
        const payroll = await db.query(
            "SELECT * FROM payroll WHERE user_id = $1 AND month = '2026-03'",
            [userId]
        );
        console.log("\n5. March 2026 Payroll Record (The 'Wrong' Record):");
        if (payroll.rows.length > 0) {
            console.table(payroll.rows);
        } else {
            console.log("No payroll record found for March 2026 - maybe it wasn't generated yet or uses a different ID.");
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

getWrongData();
