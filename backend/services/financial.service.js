const db = require('../config/db');

// logic extracted from financial.controller.js to be shared with governance.controller.js
const processApprovedRequest = async (client, request) => {
    let entries = request.data;

    // Robust parsing if data comes in as string
    if (typeof entries === 'string') {
        try {
            entries = JSON.parse(entries);
        } catch (e) {
            console.error('[FINANCIAL_SERVICE] Error parsing request data:', e);
            return;
        }
    }

    if (!entries || !Array.isArray(entries)) {
        console.warn('[FINANCIAL_SERVICE] No valid entries found in request data.');
        return;
    }

    const typeLower = (request.type || '').toLowerCase();
    const month = request.month;

    console.log(`[FINANCIAL_SERVICE] Processing approved request: ID ${request.id}, Type: ${request.type}, Month: ${month}`);

    // Detect if this is a Salary Advance (which needs accumulation) or an Overwrite component
    const isAdvance = typeLower.includes('advance');
    const isFuel = typeLower.includes('fuel') || typeLower.includes('petrol');

    // 1. Fetch the mapping from the Salary Component 'Catalog' (Payroll Settings)
    // We look for components that match the request type purpose.
    let searchPattern = '';
    if (isFuel) searchPattern = '%fuel%';
    else if (isAdvance) searchPattern = '%advance%';
    else searchPattern = `%${request.type.split(' ')[0]}%`;

    let compRes = await client.query(
        "SELECT id, name FROM salary_components WHERE name ILIKE $1 AND LOWER(status) = 'active' LIMIT 1",
        [searchPattern]
    );

    if (compRes.rows.length === 0) {
        console.error(`[FINANCIAL_SERVICE] CRITICAL: Component for '${request.type}' not found in Catalog (search: ${searchPattern})`);
        throw new Error(`The salary component for '${request.type}' is missing from the Payroll Settings catalog. Please create/activate it first.`);
    }

    const componentId = compRes.rows[0].id;
    const catalogName = compRes.rows[0].name;
    console.log(`[FINANCIAL_SERVICE] Mapping request '${request.type}' to Catalog Component: ${catalogName} (ID: ${componentId})`);

    for (const entry of entries) {
        const amount = parseFloat(entry.amount) || 0;
        const quantity = parseFloat(entry.liters || entry.quantity || 0);

        if (isAdvance) {
            // ACCUMULATE for Salary Advances — status='Approved' so payroll can pick it up directly
            await client.query(`
                INSERT INTO monthly_salary_overrides (employee_id, month, component_id, amount, quantity, reason, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'Approved')
                ON CONFLICT (employee_id, month, component_id) 
                DO UPDATE SET 
                    amount = COALESCE(monthly_salary_overrides.amount, 0) + EXCLUDED.amount, 
                    reason = monthly_salary_overrides.reason || ' + ' || EXCLUDED.reason,
                    status = 'Approved'
            `, [entry.employee_id, month, componentId, amount, quantity, `Approved ${request.type}`]);
            console.log(`[FINANCIAL_SERVICE] Advance inserted for Emp ${entry.employee_id}: +${amount} (Status: Approved)`);
        } else {
            // OVERWRITE for others (Fuel, etc.) — status='Approved' so payroll can pick it up directly
            await client.query(`
                INSERT INTO monthly_salary_overrides (employee_id, month, component_id, amount, quantity, reason, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'Approved')
                ON CONFLICT (employee_id, month, component_id) 
                DO UPDATE SET 
                    amount = EXCLUDED.amount, 
                    quantity = EXCLUDED.quantity, 
                    reason = EXCLUDED.reason,
                    status = 'Approved'
            `, [entry.employee_id, month, componentId, amount, quantity, entry.reason || `Approved ${request.type}`]);
            console.log(`[FINANCIAL_SERVICE] Override inserted for Emp ${entry.employee_id}: ${amount} (Status: Approved)`);
        }
    }
};

module.exports = { processApprovedRequest };
