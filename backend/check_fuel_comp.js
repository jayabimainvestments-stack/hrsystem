const db = require('./config/db');
db.query("SELECT id, name, status FROM salary_components WHERE name ILIKE '%fuel%'").then(r => {
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
});
