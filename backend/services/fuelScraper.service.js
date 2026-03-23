const axios = require('axios');
const cheerio = require('cheerio');
const db = require('../config/db');

/**
 * Scrapes the latest fuel price for Petrol 92 from Ceypetco's website.
 * Updates the fuel_price_history table if a new price/date is found.
 */
async function scrapeFuelPrice() {
    console.log("[FUEL_SCRAPER] Starting scheduled fuel price check...");
    try {
        const url = 'https://ceypetco.gov.lk/historical-prices/';
        const { data } = await axios.get(url, {
            timeout: 15000, // 15 seconds timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });

        const $ = cheerio.load(data);
        
        // Target: Lanka Petrol 92 Octane (LP 92)
        // Table structure identified: tr:nth-child(2) is latest data
        // Column 1: Date, Column 3: LP 92 Price
        const latestRow = $('table tr').eq(1); // Index 1 is the first data row after header
        const rawDate = latestRow.find('td').eq(0).text().trim();
        const rawPrice = latestRow.find('td').eq(2).text().trim();

        if (!rawPrice || !rawDate) {
            console.error("[FUEL_SCRAPER] Could not parse price or date from the table.");
            return;
        }

        const price = parseFloat(rawPrice);
        
        // Parse date (Format seen: 10.03.2026)
        // Convert to YYYY-MM-DD
        const dateParts = rawDate.split('.');
        if (dateParts.length !== 3) {
            console.error("[FUEL_SCRAPER] Invalid date format received:", rawDate);
            return;
        }
        const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

        console.log(`[FUEL_SCRAPER] Detected Latest Price: Rs. ${price} for Date: ${formattedDate}`);

        // Check if this date/price already exists in history
        const checkRes = await db.query(
            "SELECT * FROM fuel_price_history WHERE effective_from_date = $1",
            [formattedDate]
        );

        if (checkRes.rows.length === 0) {
            // New price change detected!
            await db.query(`
                INSERT INTO fuel_price_history (price_per_liter, effective_from_date, source)
                VALUES ($1, $2, 'Auto-Scraper (CEYPETCO)')
            `, [price, formattedDate]);
            
            // Also update the global policy rate for current use
            await db.query(
                "UPDATE attendance_policies SET fuel_rate_per_liter = $1, updated_at = NOW() WHERE id = 1",
                [price]
            );

            console.log(`[FUEL_SCRAPER] SUCCESS: Recorded new price of ${price} starting from ${formattedDate}`);
            return { updated: true, price, date: formattedDate };
        } else {
            // Check if price matches (historical correction)
            if (parseFloat(checkRes.rows[0].price_per_liter) !== price) {
                await db.query(
                    "UPDATE fuel_price_history SET price_per_liter = $1 WHERE effective_from_date = $2",
                    [price, formattedDate]
                );
                console.log(`[FUEL_SCRAPER] Updated price for existing date ${formattedDate} to ${price}`);
            } else {
                console.log("[FUEL_SCRAPER] No price change detected. System is up to date.");
            }
            return { updated: false };
        }

    } catch (error) {
        console.error("[FUEL_SCRAPER] Error during scraping:", error.message);
        throw error;
    }
}

module.exports = { scrapeFuelPrice };
