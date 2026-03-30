const db = require('./backend/config/db');

async function fixLiabilities() {
    try {
        await db.pool.query('BEGIN');
        
        console.log("Recalculating liabilities for 2026-03 from the actual payroll data...");

        // EPF 12%
        await db.pool.query(`
            UPDATE payroll_liabilities 
            SET total_payable = (SELECT COALESCE(SUM(epf_employer), 0) FROM payroll WHERE month = '2026-03')
            WHERE month = '2026-03' AND type = 'EPF 12%'
        `);
        
        // EPF 8%
        await db.pool.query(`
            UPDATE payroll_liabilities 
            SET total_payable = (SELECT COALESCE(SUM(epf_employee), 0) FROM payroll WHERE month = '2026-03')
            WHERE month = '2026-03' AND type = 'EPF 8%'
        `);

        // ETF 3%
        await db.pool.query(`
            UPDATE payroll_liabilities 
            SET total_payable = (SELECT COALESCE(SUM(etf_employer), 0) FROM payroll WHERE month = '2026-03')
            WHERE month = '2026-03' AND type = 'ETF 3%'
        `);

        // Welfare 2%
        await db.pool.query(`
            UPDATE payroll_liabilities 
            SET total_payable = (SELECT COALESCE(SUM(welfare), 0) FROM payroll WHERE month = '2026-03')
            WHERE month = '2026-03' AND type = 'Welfare 2%'
        `);

        await db.pool.query('COMMIT');
        console.log("Liabilities fixed successfully!");
    } catch (error) {
        await db.pool.query('ROLLBACK');
        console.error("Error fixing liabilities:", error);
    } finally {
        await db.pool.end();
        process.exit();
    }
}

fixLiabilities();
