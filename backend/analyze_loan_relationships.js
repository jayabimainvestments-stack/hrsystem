const { Client } = require('pg');
require('dotenv').config();

async function analyzeRelationships() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hr_db'
    });

    try {
        await client.connect();

        // Find tables that have a foreign key to employee_loans
        const fkRes = await client.query(`
            SELECT
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name='employee_loans';
        `);
        console.log('Tables referencing employee_loans:', fkRes.rows);

        // Also check if loan_id is used in any common tables even without FK
        const commonTables = ['payroll', 'monthly_salary_overrides', 'manual_deductions'];
        for (const table of commonTables) {
            const tableCheck = await client.query("SELECT * FROM information_schema.columns WHERE table_name = $1 AND column_name LIKE '%loan%'", [table]);
            if (tableCheck.rows.length > 0) {
                console.log(`Potential loan reference in ${table}:`, tableCheck.rows.map(r => r.column_name));
            }
        }

        // Specifically check if ID 2 or 3 are used in payroll
        const payrollCheck = await client.query("SELECT * FROM payroll WHERE loan_id IN (2, 3)");
        console.log('Payroll records for Loan ID 2 or 3:', payrollCheck.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

analyzeRelationships();
