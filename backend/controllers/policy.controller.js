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
    try {
        const result = await db.query(
            `UPDATE attendance_policies 
             SET absent_day_amount = $1, late_hourly_rate = $2, fuel_rate_per_liter = $3, updated_at = NOW()
             WHERE id = 1 RETURNING *`,
            [absent_day_amount, late_hourly_rate, fuel_rate_per_liter]
        );
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update fuel rate only
const updateFuelRate = async (req, res) => {
    const { fuel_rate_per_liter } = req.body;
    if (!fuel_rate_per_liter || parseFloat(fuel_rate_per_liter) <= 0) {
        return res.status(400).json({ message: 'Valid fuel rate is required' });
    }
    try {
        const result = await db.query(
            `UPDATE attendance_policies SET fuel_rate_per_liter = $1, updated_at = NOW() WHERE id = 1 RETURNING *`,
            [fuel_rate_per_liter]
        );
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getPolicy,
    updatePolicyRates,
    updateFuelRate
};
