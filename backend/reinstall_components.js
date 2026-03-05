const db = require('./config/db');

async function reinstallComponents() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        console.log("--- Reinstalling Earning & Deduction Components ---");

        const defaults = [
            { name: 'Basic Salary', type: 'Earning', is_taxable: true, epf: true, etf: true, welfare: true },
            { name: 'Transport Allowance', type: 'Earning', is_taxable: true, epf: false, etf: false, welfare: false },
            { name: 'Meal Allowance', type: 'Earning', is_taxable: true, epf: false, etf: false, welfare: false },
            { name: 'Performance Bonus', type: 'Earning', is_taxable: true, epf: true, etf: true, welfare: false },
            { name: 'Overtime', type: 'Earning', is_taxable: true, epf: false, etf: false, welfare: false },
            { name: 'Attendance Allowance', type: 'Earning', is_taxable: true, epf: true, etf: true, welfare: false },
            { name: 'EPF 8%', type: 'Deduction', is_taxable: false, epf: false, etf: false, welfare: false },
            { name: 'Loan Deduction', type: 'Deduction', is_taxable: false, epf: false, etf: false, welfare: false },
            { name: 'Salary Advance', type: 'Deduction', is_taxable: false, epf: false, etf: false, welfare: false },
            { name: 'No Pay', type: 'Deduction', is_taxable: true, epf: false, etf: false, welfare: false },
            { name: 'Welfare', type: 'Deduction', is_taxable: false, epf: false, etf: false, welfare: false }
        ];

        for (const comp of defaults) {
            // Check if exists
            const check = await client.query("SELECT id FROM salary_components WHERE name = $1", [comp.name]);

            if (check.rows.length === 0) {
                console.log(`➕ Installing missing component: ${comp.name}`);
                await client.query(
                    "INSERT INTO salary_components (name, type, is_taxable, epf_eligible, etf_eligible, welfare_eligible) VALUES ($1, $2, $3, $4, $5, $6)",
                    [comp.name, comp.type, comp.is_taxable, comp.epf, comp.etf, comp.welfare]
                );
            } else {
                console.log(`✅ Component exists: ${comp.name} - Updating flags...`);
                // Ensure proper configuration
                await client.query(
                    "UPDATE salary_components SET type=$2, is_taxable=$3, epf_eligible=$4, etf_eligible=$5, welfare_eligible=$6, status='Active' WHERE name=$1",
                    [comp.name, comp.type, comp.is_taxable, comp.epf, comp.etf, comp.welfare]
                );
            }
        }

        // Remove duplicates like 'NOPAY' vs 'No Pay' if desired, but risky. Keeping it safe.

        await client.query('COMMIT');
        console.log("--- Reinstallation Complete ---");
        process.exit();
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Reinstallation failed:", error);
        process.exit(1);
    } finally {
        client.release();
    }
}

reinstallComponents();
