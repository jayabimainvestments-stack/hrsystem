require('dotenv').config({ path: './backend/.env' });
const db = require('./config/db');

const components = [
    { name: 'Budgetary Allowance 1', type: 'Earning', is_taxable: true, epf: false, etf: false },
    { name: 'Budgetary Allowance 2', type: 'Earning', is_taxable: true, epf: false, etf: false },
    { name: 'Annual Performance', type: 'Earning', is_taxable: true, epf: false, etf: false },
    { name: 'Monthly Performance', type: 'Earning', is_taxable: true, epf: false, etf: false },
    { name: 'Travelling', type: 'Earning', is_taxable: true, epf: false, etf: false },
    { name: 'Monthly fuel', type: 'Earning', is_taxable: true, epf: false, etf: false },
    { name: 'Motorcycle maintenance', type: 'Earning', is_taxable: true, epf: false, etf: false },
    { name: 'Staff Loan Installment', type: 'Deduction', is_taxable: false, epf: false, etf: false },
    { name: 'Salary Advance', type: 'Deduction', is_taxable: false, epf: false, etf: false }
];

async function seed() {
    try {
        console.log("Seeding Components...");
        for (const c of components) {
            const check = await db.query("SELECT id FROM salary_components WHERE name = $1", [c.name]);
            if (check.rows.length === 0) {
                await db.query(`
                    INSERT INTO salary_components (name, type, is_taxable, epf_eligible, etf_eligible, status)
                    VALUES ($1, $2, $3, $4, $5, 'Active')
                `, [c.name, c.type, c.is_taxable, c.epf, c.etf]);
                console.log(`Created: ${c.name}`);
            } else {
                console.log(`Exists: ${c.name}`);
            }
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
seed();
