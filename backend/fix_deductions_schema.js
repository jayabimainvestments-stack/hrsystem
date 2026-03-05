const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Load .env
const envPath = path.join(__dirname, '.env');
let connectionString = process.env.DATABASE_URL;

if (!connectionString && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    for (const line of envLines) {
        if (line.startsWith('DATABASE_URL=')) {
            connectionString = line.split('=')[1].trim();
            break;
        }
    }
}

const pool = new Pool({ connectionString });

async function fixSchema() {
    console.log("=== FIXING ATTENDANCE_DEDUCTIONS SCHEMA ===");
    try {
        // Check columns
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'attendance_deductions'
        `);
        const columns = res.rows.map(r => r.column_name);
        console.log("Current Columns:", columns);

        if (!columns.includes('created_by')) {
            console.log("Adding 'created_by' column...");
            await pool.query("ALTER TABLE attendance_deductions ADD COLUMN created_by INTEGER REFERENCES users(id)");
        } else {
            console.log("'created_by' exists.");
        }

        if (!columns.includes('approved_by_1')) {
            console.log("Adding 'approved_by_1' column...");
            await pool.query("ALTER TABLE attendance_deductions ADD COLUMN approved_by_1 INTEGER REFERENCES users(id)");
        } else {
            console.log("'approved_by_1' exists.");
        }

        // Also update verify script might have created
        if (!columns.includes('approved_at_1')) {
            console.log("Adding 'approved_at_1' column...");
            await pool.query("ALTER TABLE attendance_deductions ADD COLUMN approved_at_1 TIMESTAMP");
        }

        console.log("✅ Schema Checked/Updated.");

    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        await pool.end();
    }
}

fixSchema();
