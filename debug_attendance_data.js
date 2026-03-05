
const db = require('./backend/config/db');

async function debugAttendance() {
    try {
        const empName = 'SENEVIRATHNA WASALA KAIHANDA KULATHUNGA ADHIKARAMLAGE PRADEEP PRASANNA BANDARA';
        console.log('Searching for employee:', empName);

        const empResult = await db.query('SELECT e.id, u.name FROM employees e JOIN users u ON e.user_id = u.id WHERE u.name = $1', [empName]);

        if (empResult.rows.length === 0) {
            console.log('Employee not found by exact name.');
            process.exit(0);
        }

        const empId = empResult.rows[0].id;
        console.log('Found Employee ID:', empId);

        const startDate = '2026-01-01';
        const endDate = '2026-02-21';

        const attResult = await db.query('SELECT * FROM attendance WHERE employee_id = $1 AND date BETWEEN $2 AND $3', [empId, startDate, endDate]);
        console.log(`\nFound ${attResult.rows.length} attendance records between ${startDate} and ${endDate}`);
        attResult.rows.forEach(r => console.log(`Date: ${r.date.toISOString().split('T')[0]}, Status: ${r.status}`));

        const leaveResult = await db.query('SELECT * FROM leaves l JOIN employees e ON e.user_id = l.user_id WHERE e.id = $1 AND (l.start_date <= $3 AND l.end_date >= $2)', [empId, startDate, endDate]);
        console.log(`\nFound ${leaveResult.rows.length} relevant leave records`);
        leaveResult.rows.forEach(l => console.log(`Leave: ${l.leave_type}, Start: ${l.start_date.toISOString().split('T')[0]}, End: ${l.end_date.toISOString().split('T')[0]}, Status: ${l.status}`));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

debugAttendance();
