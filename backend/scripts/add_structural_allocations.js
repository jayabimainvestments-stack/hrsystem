const db = require('../config/db');

async function addStructuralAllocations() {
    try {
        console.log('--- Adding Structural Allocations Component ---');

        const componentName = 'Structural Allocations';

        // Check if exists
        const check = await db.query('SELECT * FROM salary_components WHERE name = $1', [componentName]);

        if (check.rows.length > 0) {
            console.log(`Component '${componentName}' already exists.`);
        } else {
            const query = `
                INSERT INTO salary_components (
                    name, type, is_taxable, epf_eligible, etf_eligible, welfare_eligible, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `;
            const values = [componentName, 'Earning', true, false, false, false, 'Active'];


            const res = await db.query(query, values);
            console.log(`Successfully added '${componentName}' with ID: ${res.rows[0].id}`);
        }

    } catch (error) {
        console.error('Error adding component:', error);
    } finally {
        process.exit();
    }
}

addStructuralAllocations();
