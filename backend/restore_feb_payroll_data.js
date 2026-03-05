const db = require('./config/db');

const febData = [
  {
    "employee_id": 3, // HASITHA@jayabima.com
    "structure": [
      { "name": "Basic pay", "amount": 30000.00 },
      { "name": "Annual Performance", "amount": 54500.00 },
      { "name": "Travelling", "amount": 65000.00 },
      { "name": "E.P.F. 8%", "amount": 600.00 }
    ]
  },
  {
    "employee_id": 4, // KANCHANA@jayabima.com
    "structure": [
      { "name": "Basic pay", "amount": 30000.00 },
      { "name": "Annual Performance", "amount": 38500.00 },
      { "name": "E.P.F. 8%", "amount": 600.00 }
    ]
  },
  {
    "employee_id": 6, // MAYURI@jayabima.com
    "structure": [
      { "name": "Basic pay", "amount": 30000.00 },
      { "name": "Annual Performance", "amount": 13450.00 },
      { "name": "Monthly Performance", "amount": 3000.00 },
      { "name": "Travelling", "amount": 7000.00 },
      { "name": "E.P.F. 8%", "amount": 600.00 }
    ]
  },
  {
    "employee_id": 5, // LAHIRU@jayabima.com
    "structure": [
      { "name": "Basic pay", "amount": 30000.00 },
      { "name": "STAFF LOAN INSTALLMENT", "amount": 9600.00, "installments": 5 },
      { "name": "Annual Performance", "amount": 25450.00 },
      { "name": "Monthly Performance", "amount": 7000.00 },
      { "name": "Travelling", "amount": 9000.00 },
      { "name": "Monthly fuel", "amount": 19825.00 },
      { "name": "Motorcycle maintenance", "amount": 10000.00 },
      { "name": "E.P.F. 8%", "amount": 600.00 }
    ]
  },
  {
    "employee_id": 7, // PRASANNA@jayabima.com
    "structure": [
      { "name": "Basic pay", "amount": 30000.00 },
      { "name": "SALARY ADVANCE AND OTHERS", "amount": 10000.00 },
      { "name": "Annual Performance", "amount": 25450.00 },
      { "name": "Monthly Performance", "amount": 6000.00 },
      { "name": "Travelling", "amount": 9000.00 },
      { "name": "Monthly fuel", "amount": 19825.00 },
      { "name": "Motorcycle maintenance", "amount": 7000.00 },
      { "name": "E.P.F. 8%", "amount": 600.00 }
    ]
  },
  {
    "employee_id": 2, // KRISHANTHA@jayabima.com
    "structure": [
      { "name": "Basic pay", "amount": 30000.00 },
      { "name": "Annual Performance", "amount": 68500.00 },
      { "name": "Travelling", "amount": 65000.00 },
      { "name": "E.P.F. 8%", "amount": 600.00 }
    ]
  }
];

async function restore() {
    try {
        console.log("--- RESTORING FEBRUARY SALARY STRUCTURE ---");

        // 1. Get Component IDs
        const compRes = await db.query("SELECT id, name FROM salary_components");
        const compMap = {};
        compRes.rows.forEach(c => compMap[c.name] = c.id);

        for (const emp of febData) {
            console.log(`Processing Employee ID: ${emp.employee_id}...`);
            
            // Clear existing for this employee
            await db.query("DELETE FROM employee_salary_structure WHERE employee_id = $1", [emp.employee_id]);

            for (const item of emp.structure) {
                const cid = compMap[item.name];
                if (cid) {
                    await db.query(
                        "INSERT INTO employee_salary_structure (employee_id, component_id, amount, installments_remaining) VALUES ($1, $2, $3, $4)",
                        [emp.employee_id, cid, item.amount, item.installments || null]
                    );
                } else {
                    console.warn(`! Component not found: ${item.name}`);
                }
            }
        }

        console.log("✅ SUCCESS: February salary structure restored.");
        process.exit(0);
    } catch (err) {
        console.error("❌ ERROR:", err);
        process.exit(1);
    }
}

restore();
