const db = require('../config/db');

// Get all holidays
const getHolidays = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM company_holidays ORDER BY date ASC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('[HOLIDAY_FETCH_ERROR]', error);
        res.status(500).json({ message: 'Error fetching holidays' });
    }
};

// Add a holiday
const addHoliday = async (req, res) => {
    const { date, name, type } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO company_holidays (date, name, type) VALUES ($1, $2, $3) RETURNING *',
            [date, name, type || 'Public Holiday']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // unique violation
            return res.status(400).json({ message: 'A holiday with this date already exists.' });
        }
        console.error('[HOLIDAY_ADD_ERROR]', error);
        res.status(500).json({ message: 'Error adding holiday' });
    }
};

// Delete a holiday
const deleteHoliday = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM company_holidays WHERE id = $1', [id]);
        res.status(200).json({ message: 'Holiday deleted successfully' });
    } catch (error) {
        console.error('[HOLIDAY_DELETE_ERROR]', error);
        res.status(500).json({ message: 'Error deleting holiday' });
    }
};

module.exports = { getHolidays, addHoliday, deleteHoliday };
