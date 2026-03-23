const db = require('../config/db');

// Get Policy
const getPolicy = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM attendance_policies WHERE id = 1');
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update Policy (Only absent_day_amount and late_hourly_rate for now)
const updatePolicyRates = async (req, res) => {
    const { absent_day_amount, late_hourly_rate, fuel_rate_per_liter } = req.body;
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
        const result = await client.query(
            `UPDATE attendance_policies 
             SET absent_day_amount = $1, late_hourly_rate = $2, fuel_rate_per_liter = $3, updated_at = NOW()
             WHERE id = 1 RETURNING *`,
            [absent_day_amount, late_hourly_rate, fuel_rate_per_liter]
        );

        // Record in history
        if (fuel_rate_per_liter !== undefined) {
            await client.query(`
                INSERT INTO fuel_price_history (price_per_liter, effective_from_date, source)
                VALUES ($1, CURRENT_DATE, 'Manual Admin Update')
                ON CONFLICT (effective_from_date) DO UPDATE SET price_per_liter = EXCLUDED.price_per_liter
            `, [fuel_rate_per_liter]);
        }

        await client.query('COMMIT');
        res.status(200).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};

// Update fuel rate only
const updateFuelRate = async (req, res) => {
    const { fuel_rate_per_liter } = req.body;
    if (!fuel_rate_per_liter || parseFloat(fuel_rate_per_liter) <= 0) {
        return res.status(400).json({ message: 'Valid fuel rate is required' });
    }
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
        const result = await client.query(
            `UPDATE attendance_policies SET fuel_rate_per_liter = $1, updated_at = NOW() WHERE id = 1 RETURNING *`,
            [fuel_rate_per_liter]
        );

        // Record in history
        await client.query(`
            INSERT INTO fuel_price_history (price_per_liter, effective_from_date, source)
            VALUES ($1, CURRENT_DATE, 'Manual Entry')
            ON CONFLICT (effective_from_date) DO UPDATE SET price_per_liter = EXCLUDED.price_per_liter
        `, [fuel_rate_per_liter]);

        await client.query('COMMIT');
        res.status(200).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};

// Get fuel price history
const getFuelHistory = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM fuel_price_history ORDER BY effective_from_date DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Preview fuel split calculation for multiple employees
const getFuelSplitPreview = async (req, res) => {
    const { month, employees } = req.body; // employees: [{ id, liters }]
    if (!month || !employees || !Array.isArray(employees)) {
        return res.status(400).json({ message: 'Month and employees array are required' });
    }

    try {
        const { calculateSplitFuelAllowance } = require('./payroll.controller');
        
        // Determine start and end date for the month
        const [year, monthNum] = month.split('-').map(Number);
        
        // Period: 25th of last month to 24th of current month (prevents 1-day overlap)
        const lastMonthDate = new Date(year, monthNum - 2, 25);
        const startDate = lastMonthDate.toISOString().split('T')[0];
        
        const currentMonthEnd = new Date(year, monthNum - 1, 24);
        const endDate = currentMonthEnd.toISOString().split('T')[0];

        const results = {};
        for (const emp of employees) {
            if (parseFloat(emp.liters) > 0) {
                const calc = await calculateSplitFuelAllowance(db, emp.liters, startDate, endDate);
                results[emp.id] = {
                    totalAmount: calc.totalAmount,
                    reason: calc.reason,
                    dailyBreakdown: calc.dailyBreakdown
                };
            } else {
                results[emp.id] = { totalAmount: 0, reason: '', dailyBreakdown: [] };
            }
        }

        res.status(200).json(results);
    } catch (error) {
        console.error("[PREVIEW_FUEL] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getPolicy,
    updatePolicyRates,
    updateFuelRate,
    getFuelHistory,
    getFuelSplitPreview
};
