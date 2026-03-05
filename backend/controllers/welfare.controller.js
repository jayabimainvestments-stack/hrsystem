const db = require('../config/db');

// @desc    Get all welfare ledger transactions
// @route   GET /api/welfare/ledger
// @access  Private (Admin/HR)
const getLedger = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM welfare_ledger ORDER BY transaction_date DESC, created_at DESC');

        // Calculate balance
        const balanceRes = await db.query(`
            SELECT 
                SUM(CASE WHEN type = 'Collection' THEN amount ELSE 0 END) - 
                SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END) as balance
            FROM welfare_ledger
        `);

        const balance = balanceRes.rows[0].balance || 0;

        res.status(200).json({
            transactions: result.rows,
            balance: parseFloat(balance)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Record a welfare expense
// @route   POST /api/welfare/expense
// @access  Private (Admin/HR)
const recordExpense = async (req, res) => {
    const { amount, description, date } = req.body;

    if (!amount || !description) {
        return res.status(400).json({ message: 'Amount and description are required' });
    }

    try {
        const result = await db.query(
            `INSERT INTO welfare_ledger (transaction_date, type, amount, description) 
             VALUES ($1, 'Expense', $2, $3) 
             RETURNING *`,
            [date || new Date().toISOString().split('T')[0], amount, description]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a welfare ledger entry
// @route   DELETE /api/welfare/ledger/:id
// @access  Private (Admin/HR)
const deleteLedgerEntry = async (req, res) => {
    const { id } = req.params;

    try {
        // Only allow deleting expenses manually (Collections are automated)
        const check = await db.query('SELECT type FROM welfare_ledger WHERE id = $1', [id]);

        if (check.rows.length === 0) {
            return res.status(404).json({ message: 'Entry not found' });
        }

        if (check.rows[0].type !== 'Expense') {
            return res.status(400).json({ message: 'Only expense entries can be manually deleted. Collection entries are linked to payroll records.' });
        }

        await db.query('DELETE FROM welfare_ledger WHERE id = $1', [id]);
        res.status(200).json({ message: 'Entry deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getLedger,
    recordExpense,
    deleteLedgerEntry
};
