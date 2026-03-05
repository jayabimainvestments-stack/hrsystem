/**
 * Helper to restore leave balance if employee works during an approved leave
 */
const reconcileLeaveBalance = async (client, employeeId, date, status) => {
    // Only working statuses trigger reconciliation
    if (status !== 'Present' && status !== 'Late') return false;

    try {
        // Find overlapping APPROVED leave for this employee
        const leaveRes = await client.query(`
            SELECT l.* FROM leaves l
            JOIN employees e ON e.user_id = l.user_id
            WHERE e.id = $1 
            AND l.status = 'Approved'
            AND $2::date BETWEEN l.start_date AND l.end_date
            LIMIT 1
        `, [employeeId, date]);

        if (leaveRes.rows.length === 0) return false;

        const leave = leaveRes.rows[0];

        // If this was a paid day, restore balance
        if (parseFloat(leave.paid_days) > 0) {
            const year = new Date(leave.start_date).getFullYear();

            // Restore appropriate amount (usually 1.0, but 0.5 for Half Day)
            const restoreAmount = Math.min(1.0, parseFloat(leave.no_of_days));

            await client.query(`
                UPDATE leave_balances 
                SET used_days = used_days - $1
                WHERE user_id = $2 AND leave_type_id = $3 AND year = $4
            `, [restoreAmount, leave.user_id, leave.leave_type_id, year]);

            console.log(`[RECONCILE] Restored ${restoreAmount} day(s) to balance for User ${leave.user_id} (Leave ID: ${leave.id}) due to work on ${date}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Reconcile Error:', error);
        return false;
    }
};

/**
 * Helper to reverse reclamation (if attendance is deleted or changed to non-working)
 */
const reverseReclaimedBalance = async (client, attendanceId) => {
    try {
        const attRes = await client.query('SELECT * FROM attendance WHERE id = $1', [attendanceId]);
        if (attRes.rows.length === 0 || !attRes.rows[0].leave_reclaimed) return;

        const att = attRes.rows[0];

        // Find the leave record that was overlapping
        const leaveRes = await client.query(`
            SELECT l.* FROM leaves l
            JOIN employees e ON e.user_id = l.user_id
            WHERE e.id = $1 
            AND l.status = 'Approved'
            AND $2::date BETWEEN l.start_date AND l.end_date
            LIMIT 1
        `, [att.employee_id, att.date]);

        if (leaveRes.rows.length > 0) {
            const leave = leaveRes.rows[0];
            const year = new Date(leave.start_date).getFullYear();
            const restoreAmount = Math.min(1.0, parseFloat(leave.no_of_days));

            // Re-deduct
            await client.query(`
                UPDATE leave_balances 
                SET used_days = used_days + $1
                WHERE user_id = $2 AND leave_type_id = $3 AND year = $4
            `, [restoreAmount, leave.user_id, leave.leave_type_id, year]);

            console.log(`[REVERSE] Deducted ${restoreAmount} day(s) from balance for User ${leave.user_id} (Leave ID: ${leave.id}) because attendance on ${att.date} was removed/changed`);
        }
    } catch (error) {
        console.error('Reverse Reconciliation Error:', error);
    }
};

module.exports = {
    reconcileLeaveBalance,
    reverseReclaimedBalance
};
