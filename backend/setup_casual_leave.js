const db = require('./config/db');

async function processLeave() {
    try {
        await db.query('BEGIN');

        // 1. Insert the leave record
        const insertRes = await db.query(`
            INSERT INTO leaves (
                user_id, 
                leave_type_id, 
                leave_type, 
                start_date, 
                end_date, 
                no_of_days, 
                paid_days, 
                unpaid_days, 
                is_unpaid, 
                reason, 
                status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        `, [
            37,                    // user_id
            11,                    // leave_type_id (Casual Leave)
            'Casual Leave',        // leave_type
            '2026-02-09',          // start_date
            '2026-02-09',          // end_date
            1.0,                   // no_of_days
            1.0,                   // paid_days
            0.0,                   // unpaid_days
            false,                 // is_unpaid
            'Standardization Audit - User Setup', // reason
            'Approved'             // status
        ]);

        console.log('Inserted leave ID:', insertRes.rows[0].id);

        // 2. Update the balance
        const balanceRes = await db.query(`
            UPDATE leave_balances 
            SET used_days = used_days + 1 
            WHERE user_id = 37 
            AND leave_type_id = 11 
            AND year = 2026
            RETURNING used_days, remaining_days
        `);

        if (balanceRes.rows.length > 0) {
            console.log('Updated balance:', balanceRes.rows[0]);
        }

        await db.query('COMMIT');
        console.log('All operations committed successfully.');
        process.exit(0);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Transaction failed:', error);
        process.exit(1);
    }
}

processLeave();
