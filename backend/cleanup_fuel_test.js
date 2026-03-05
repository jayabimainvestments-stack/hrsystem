const db = require('./config/db');

async function cleanupFuel() {
    const month = '2026-02';
    try {
        console.log(`--- Starting Fuel Allowance Cleanup for ${month} ---`);

        // 1. Get Fuel Component ID
        const compRes = await db.query("SELECT id FROM salary_components WHERE name ILIKE '%fuel%' LIMIT 1");
        if (compRes.rows.length === 0) {
            console.log("❌ Fuel component not found in salary_components table.");
            process.exit(1);
        }
        const fuelComponentId = compRes.rows[0].id;
        console.log(`✅ Found Fuel Component ID: ${fuelComponentId}`);

        // 2. Delete from monthly_salary_overrides
        const delOverrides = await db.query(
            "DELETE FROM monthly_salary_overrides WHERE month = $1 AND component_id = $2",
            [month, fuelComponentId]
        );
        console.log(`✅ Deleted ${delOverrides.rowCount} records from monthly_salary_overrides.`);

        // 3. Delete from financial_requests
        const delRequests = await db.query(
            "DELETE FROM financial_requests WHERE month = $1 AND type ILIKE '%Fuel%'",
            [month]
        );
        console.log(`✅ Deleted ${delRequests.rowCount} records from financial_requests.`);

        console.log(`--- Cleanup Complete for ${month} ---`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Cleanup failed:", error);
        process.exit(1);
    }
}

cleanupFuel();
