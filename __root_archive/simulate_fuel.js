const { Pool } = require('pg');
require('dotenv').config({ path: 'g:/HR/ANTIGRAVITY/HR/HR PACEGE/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Mocking the function logic locally to inspect it
async function simulateFuel() {
    const totalLiters = 52.36; // Example liters for Prasanna
    const startDate = '2026-02-25';
    const endDate = '2026-03-25';

    try {
        let workingDays = [];
        let curr = new Date(startDate);
        const end = new Date(endDate);
        
        console.log(`Simulating Fuel for ${startDate} to ${endDate}`);
        
        while (curr <= end) {
            const day = curr.getDay();
            if (day !== 0 && day !== 6) { // Not Sat or Sun
                workingDays.push(new Date(curr).toISOString().split('T')[0]);
            }
            curr.setDate(curr.getDate() + 1);
        }

        const holidayRes = await pool.query(
            "SELECT date::text FROM company_holidays WHERE date::date BETWEEN $1 AND $2",
            [startDate, endDate]
        );
        const holidays = new Set(holidayRes.rows.map(h => h.date.split(' ')[0]));
        const finalWorkingDays = workingDays.filter(d => !holidays.has(d));

        console.log("Total Working Days Found:", finalWorkingDays.length);
        console.log("Last 5 working days:", finalWorkingDays.slice(-5));

        const dailyQuota = totalLiters / finalWorkingDays.length;
        const priceCacheRes = await pool.query('SELECT effective_from_date, price_per_liter FROM fuel_price_history ORDER BY effective_from_date DESC');
        const priceHistory = priceCacheRes.rows.map(r => ({ date: new Date(r.effective_from_date), price: parseFloat(r.price_per_liter) }));

        let totalAmount = 0;
        let breakdown = [];

        for (const date of finalWorkingDays) {
            const currentDate = new Date(date);
            const applicable = priceHistory.find(h => h.date <= currentDate);
            const price = applicable ? applicable.price : 0;
            const amount = dailyQuota * price;
            totalAmount += amount;
            breakdown.push({ date, price, amount });
        }

        console.log("\nFuel Calculation Breakdown (Last 5 days):");
        breakdown.slice(-5).forEach(b => console.log(`- ${b.date}: ${b.price} LKR (Amount: ${b.amount.toFixed(2)})`));
        console.log("\nTotal Amount Calculated:", totalAmount.toFixed(2));

        await pool.end();
    } catch (err) {
        console.error(err);
    }
}

simulateFuel();
