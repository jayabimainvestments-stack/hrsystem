require('dotenv').config({ path: './backend/.env' });
const db = require('./config/db');

const employees = [
    {
        nic: '801285392V', // D M K M DISSANAYAKE
        basic: 20500,
        structure: [
            { name: 'Budgetary Allowance 1', amount: 1000 },
            { name: 'Budgetary Allowance 2', amount: 2500 },
            { name: 'Annual Performance', amount: 88500 },
            { name: 'Travelling', amount: 45000 }
        ]
    },
    {
        nic: '911851210V', // L G D H LIYANAGE
        basic: 20500,
        structure: [
            { name: 'Budgetary Allowance 1', amount: 1000 },
            { name: 'Budgetary Allowance 2', amount: 2500 },
            { name: 'Annual Performance', amount: 54500 },
            { name: 'Travelling', amount: 65000 }
        ]
    },
    {
        nic: '815723364V', // H A U K SENEVIRATHNA
        basic: 20500,
        structure: [
            { name: 'Budgetary Allowance 1', amount: 1000 },
            { name: 'Budgetary Allowance 2', amount: 2500 },
            { name: 'Annual Performance', amount: 38500 }
        ]
    },
    {
        nic: '200100800857', // N L W NISHSHANKA
        basic: 20500,
        structure: [
            { name: 'Budgetary Allowance 1', amount: 1000 },
            { name: 'Budgetary Allowance 2', amount: 2500 },
            { name: 'Annual Performance', amount: 25450 },
            { name: 'Monthly Performance', amount: 7000 },
            { name: 'Travelling', amount: 9000 },
            { name: 'Monthly fuel', amount: 19825 },
            { name: 'Motorcycle maintenance', amount: 10000 }, // Note: Sum = 71275 OK
            { name: 'Salary Advance', amount: 3000 },
            { name: 'Staff Loan Installment', amount: 9600 }
        ]
    },
    {
        nic: '975520800V', // R M P G HERATH
        basic: 20500,
        structure: [
            { name: 'Budgetary Allowance 1', amount: 1000 },
            { name: 'Budgetary Allowance 2', amount: 2500 },
            { name: 'Annual Performance', amount: 13450 },
            { name: 'Monthly Performance', amount: 3000 },
            { name: 'Travelling', amount: 7000 }
        ]
    },
    {
        nic: '981031710V', // S W K K A P P BANDARA
        basic: 26500,
        structure: [
            { name: 'Budgetary Allowance 1', amount: 1000 },
            { name: 'Budgetary Allowance 2', amount: 2500 },
            { name: 'Annual Performance', amount: 25450 },
            { name: 'Monthly Performance', amount: 6000 },
            { name: 'Travelling', amount: 9000 },
            { name: 'Monthly fuel', amount: 19825 },
            { name: 'Motorcycle maintenance', amount: 7000 },
            { name: 'Salary Advance', amount: 5000 }
        ]
    }
];

async function seed() {
    try {
        console.log("Seeding Employee Structures...");

        // 1. Get Component IDs
        const compRes = await db.query("SELECT id, name FROM salary_components");
        const compMap = {};
        compRes.rows.forEach(c => compMap[c.name] = c.id);

        for (const data of employees) {
            // Find Employee
            const empRes = await db.query("SELECT e.id, e.user_id, u.name FROM employees e JOIN users u ON e.user_id = u.id WHERE e.nic_passport = $1", [data.nic]);

            if (empRes.rows.length === 0) {
                console.error(`ERROR: Employee with NIC ${data.nic} not found!`);
                continue;
            }
            const empId = empRes.rows[0].id;
            const name = empRes.rows[0].name;
            console.log(`Processing ${name} (${data.nic})...`);

            // Clear existing
            await db.query("DELETE FROM employee_salary_structure WHERE employee_id = $1", [empId]);

            // Add Basic (as separate Update usually, but structure holds components. Basic is often stored in Employee/Salary table, but let's see if we use structure for everything or if Basic is separate. 
            // Based on createPayroll, Basic is separate: 'if (comp.name.includes("basic"))' -> Wait, createPayroll reads from structure! 
            // So we MUST add 'Basic Salary' to structure too.
            if (compMap['Basic Salary']) {
                await db.query("INSERT INTO employee_salary_structure (employee_id, component_id, amount) VALUES ($1, $2, $3)", [empId, compMap['Basic Salary'], data.basic]);
            } else {
                console.error("Basic Salary component missing!");
            }

            // Add Extras
            for (const item of data.structure) {
                const cid = compMap[item.name];
                if (cid) {
                    await db.query("INSERT INTO employee_salary_structure (employee_id, component_id, amount) VALUES ($1, $2, $3)", [empId, cid, item.amount]);
                } else {
                    console.error(`Component '${item.name}' not found in DB!`);
                }
            }
        }

        console.log("Seeding Complete.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
seed();
