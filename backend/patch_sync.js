const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'controllers', 'attendance.controller.js');
let content = fs.readFileSync(filePath, 'utf8');

const newSyncAttendance = `const syncAttendanceWithLeaves = async (req, res) => {
    const { startDate, endDate } = req.body; 
    if (!startDate || !endDate) return res.status(400).json({ message: 'Start and End dates required' });

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get all active employees
        const empRes = await client.query('SELECT e.id, e.user_id, u.name FROM employees e JOIN users u ON e.user_id = u.id');
        const employees = empRes.rows;

        // 2. Iterate through date range
        let current = new Date(startDate);
        const end = new Date(endDate);
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
        const results = { synced: 0, marked_absent: 0, marked_leave: 0 };

        while (current <= end) {
            // Local date string YYYY-MM-DD
            const dateStr = current.toLocaleDateString('en-CA');
            const dayOfWeek = current.getDay();

            // Skip weekends
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                for (const emp of employees) {
                    const attCheck = await client.query(
                        'SELECT id FROM attendance WHERE employee_id = $1 AND date = $2',
                        [emp.id, dateStr]
                    );

                    if (attCheck.rows.length === 0) {
                        // Check for approved leave
                        const leaveCheck = await client.query(\`
                            SELECT leave_type FROM leaves 
                            WHERE user_id = $1 AND status = 'Approved' 
                            AND $2::date BETWEEN start_date AND end_date
                        \`, [emp.user_id, dateStr]);

                        if (leaveCheck.rows.length > 0) {
                            await client.query(
                                \`INSERT INTO attendance (employee_id, date, status, source) 
                                 VALUES ($1, $2, 'Leave', 'System Sync')\`,
                                [emp.id, dateStr]
                            );
                            results.marked_leave++;
                        } else {
                            // Only mark as Absent if the date is in the past
                            if (dateStr < todayStr) {
                                await client.query(
                                    \`INSERT INTO attendance (employee_id, date, status, source) 
                                     VALUES ($1, $2, 'Absent', 'System Sync')\`,
                                    [emp.id, dateStr]
                                );
                                results.marked_absent++;
                            }
                        }
                    }
                }
            }
            current.setDate(current.getDate() + 1);
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Attendance synchronization complete', results });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Sync Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};`;

// Regex replacement
content = content.replace(/const syncAttendanceWithLeaves = async [\s\S]*?};/, newSyncAttendance);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated attendance.controller.js with new sync logic');
