require('dotenv').config();
const db = require('./config/db');

const orgData = [
    {
        name: "Board & Executive Management",
        roles: ["Chairman", "Managing Director / CEO", "Deputy CEO / COO", "Executive Director"]
    },
    {
        name: "Operations",
        roles: ["Head of Operations", "Operations Manager", "Operations Officer", "Documentation Officer", "Disbursement Officer", "Customer Service Officer"]
    },
    {
        name: "Credit / Lending",
        roles: ["Head of Credit", "Credit Manager", "Credit Officer / Loan Officer", "Credit Analyst", "Field Credit Officer", "Credit Documentation Officer"]
    },
    {
        name: "Risk Management",
        roles: ["Chief Risk Officer (CRO)", "Risk Manager", "Credit Risk Analyst", "Operational Risk Officer"]
    },
    {
        name: "Compliance & Legal",
        roles: ["Head of Compliance", "Compliance Officer", "AML / KYC Officer", "Legal Officer", "Company Secretary"]
    },
    {
        name: "Finance & Accounting",
        roles: ["Chief Financial Officer (CFO)", "Finance Manager", "Accountant", "Assistant Accountant", "Accounts Executive", "Cashier", "Payroll Officer"]
    },
    {
        name: "Treasury",
        roles: ["Treasury Manager", "Treasury Officer", "Liquidity Management Officer"]
    },
    {
        name: "Recovery / Collections",
        roles: ["Recovery Manager", "Collection Officer", "Field Recovery Officer", "Legal Recovery Officer"]
    },
    {
        name: "Marketing & Business Development",
        roles: ["Head of Marketing", "Business Development Manager", "Marketing Executive", "Relationship Officer", "Sales Officer"]
    },
    {
        name: "Customer Relationship Management (CRM)",
        roles: ["CRM Manager", "Relationship Manager", "Customer Support Officer", "Call Center Officer"]
    },
    {
        name: "Human Resources (HR)",
        roles: ["HR Manager", "HR Executive", "Recruitment Officer", "Training & Development Officer", "Performance Management Officer"]
    },
    {
        name: "IT / Information Systems",
        roles: ["IT Manager", "System Administrator", "Software / Core Banking Officer", "Data Analyst", "Information Security Officer"]
    },
    {
        name: "Internal Audit",
        roles: ["Head of Internal Audit", "Internal Auditor", "Audit Officer"]
    },
    {
        name: "Administration & Support Services",
        roles: ["Administration Manager", "Admin Officer", "Facilities Officer", "Procurement Officer", "Office Assistant", "Driver"]
    },
    {
        name: "Product & Strategy",
        roles: ["Strategy Manager", "Product Manager", "Market Research Analyst"]
    }
];

const seed = async () => {
    try {
        console.log('--- Starting Org Structure Seeding ---');
        await db.query('BEGIN');

        // Optional: Check for existing employees to avoid breaking foreign keys
        const empCount = await db.query('SELECT COUNT(*) FROM employees');
        if (parseInt(empCount.rows[0].count) > 0) {
            console.warn(`WARNING: ${empCount.rows[0].count} employees found. Skipping deletion of existing depts/roles to avoid errors.`);
        } else {
            console.log('Cleaning up existing metadata...');
            await db.query('DELETE FROM designations');
            await db.query('DELETE FROM departments');
        }

        for (const dept of orgData) {
            // Check if Department exists
            const existingDept = await db.query('SELECT id FROM departments WHERE name = $1', [dept.name]);
            let deptId;

            if (existingDept.rows.length > 0) {
                deptId = existingDept.rows[0].id;
                console.log(`- Department: ${dept.name} (Exists)`);
            } else {
                const deptRes = await db.query(
                    'INSERT INTO departments (name, status) VALUES ($1, $2) RETURNING id',
                    [dept.name, 'Active']
                );
                deptId = deptRes.rows[0].id;
                console.log(`- Department: ${dept.name} (Created)`);
            }

            for (const role of dept.roles) {
                // Check if Designation exists in this department
                const existingRole = await db.query(
                    'SELECT id FROM designations WHERE title = $1 AND department_id = $2',
                    [role, deptId]
                );

                if (existingRole.rows.length === 0) {
                    await db.query(
                        'INSERT INTO designations (title, department_id, status) VALUES ($1, $2, $3)',
                        [role, deptId, 'Active']
                    );
                    console.log(`  > Role: ${role} (Created)`);
                } else {
                    console.log(`  > Role: ${role} (Exists)`);
                }
            }
        }

        await db.query('COMMIT');
        console.log('\n--- Seeding Completed Successfully ---');
        process.exit();
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Seeding Failed:', error);
        process.exit(1);
    }
};

seed();
