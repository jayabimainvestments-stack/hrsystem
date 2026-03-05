const db = require('./config/db');
db.query("SELECT sc.name FROM employee_salary_structure es JOIN salary_components sc ON es.component_id = sc.id WHERE es.employee_id = 2 AND sc.name ILIKE '%advance%'")
    .then(r => {
        console.log("Count:", r.rows.length);
        console.table(r.rows);
        process.exit(0);
    });
