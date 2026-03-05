const db = require('./config/db');

async function testPreview() {
    const user_id = 16; // Krishantha
    const month = 'February';
    const year = 2026;
    const processingYear = year;

    const monthMap = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };

    const monthNum = monthMap[month] || '01';
    const datePrefix = `${processingYear}-${monthNum}`;

    try {
        const empRes = await db.query(`
            SELECT e.*, u.name 
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE u.id = $1
        `, [user_id]);

        if (empRes.rows.length === 0) throw new Error('Employee not found');
        const employee = empRes.rows[0];
        console.log('Employee Found:', employee.name, '(ID:', employee.id, ')');

        const overrideRes = await db.query(`
            SELECT component_id, amount, quantity, reason 
            FROM monthly_salary_overrides 
            WHERE employee_id = $1 AND month = $2
        `, [employee.id, datePrefix]);

        console.log('Overrides Found for', datePrefix, ':', overrideRes.rows);

        const structRes = await db.query(`
            SELECT es.amount, es.quantity, sc.name, sc.type, sc.is_taxable, sc.epf_eligible, sc.etf_eligible, sc.welfare_eligible,
                   es.installments_remaining, es.component_id, es.is_locked
            FROM employee_salary_structure es
            JOIN salary_components sc ON es.component_id = sc.id
            WHERE es.employee_id = $1
        `, [employee.id]);

        console.log('Structure components count:', structRes.rows.length);

        // Simulate the loop
        let processedOverrideIds = new Set();
        let breakdown = [];

        for (const comp of structRes.rows) {
            if (overrideRes.rows.find(o => o.component_id === comp.component_id)) {
                processedOverrideIds.add(comp.component_id);
            }
        }

        console.log('Processed Override IDs from structure:', Array.from(processedOverrideIds));

        for (const override of overrideRes.rows) {
            if (!processedOverrideIds.has(override.component_id)) {
                const compInfoRes = await db.query('SELECT name, type FROM salary_components WHERE id = $1', [override.component_id]);
                if (compInfoRes.rows.length > 0) {
                    console.log('Found extra override component:', compInfoRes.rows[0].name);
                    breakdown.push({ name: compInfoRes.rows[0].name, amount: parseFloat(override.amount), type: compInfoRes.rows[0].type });
                }
            }
        }

        console.log('Final Breakdown Items:', breakdown);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

testPreview();
