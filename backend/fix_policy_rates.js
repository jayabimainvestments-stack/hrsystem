const db = require('./config/db');

async function updateRates() {
    try {
        await db.query("UPDATE attendance_policies SET absent_day_amount = '1000', late_hourly_rate = '500' WHERE id = 1");
        console.log("Rates Updated: Absent = 1000, Late = 500/hr");
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

updateRates();
