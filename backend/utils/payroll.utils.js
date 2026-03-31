const db = require('../config/db');

/**
 * Calculates the payroll period (start and end dates) for a given month and year.
 * Based on the 'payroll_start_day' configured in attendance_policies.
 * @param {string} monthStr YYYY-MM
 * @returns {Promise<{startDate: string, endDate: string, startDay: number}>}
 */
async function getPayrollDates(monthStr) {
    // 1. Fetch policy
    const policy = await db.query('SELECT payroll_start_day FROM attendance_policies WHERE id = 1');
    const startDay = policy.rows[0]?.payroll_start_day || 1;

    const [year, month] = monthStr.split('-').map(Number);
    
    if (startDay === 1) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        return { startDate, endDate, startDay };
    } else {
        // Start from (startDay) of PREVIOUS month
        const prevMonthDate = new Date(year, month - 2, 1);
        const pYear = prevMonthDate.getFullYear();
        const pMonth = prevMonthDate.getMonth() + 1;
        
        const startDate = `${pYear}-${String(pMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
        
        // End at (startDay - 1) of CURRENT month
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(startDay - 1).padStart(2, '0')}`;
        
        return { startDate, endDate, startDay };
    }
}

module.exports = { getPayrollDates };
