const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function fullBackup() {
    const backupFile = path.join(__dirname, '../../hr_db_backup.sql');
    const writeStream = fs.createWriteStream(backupFile);

    try {
        console.log('Starting full database backup...');

        // 1. Get all tables
        const tablesRes = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `);

        const tables = tablesRes.rows.map(r => r.table_name);

        writeStream.write("-- HR Management System Database Backup\n");
        writeStream.write("-- Generated on: " + new Date().toISOString() + "\n\n");
        writeStream.write("SET statement_timeout = 0;\nSET lock_timeout = 0;\nSET client_encoding = 'UTF8';\nSET standard_conforming_strings = on;\nSET check_function_bodies = false;\nSET client_min_messages = warning;\n\n");

        for (const table of tables) {
            console.log(`Backing up table: ${table}`);

            // Get table schema (simplified)
            const schemaRes = await db.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);

            writeStream.write(`-- Table: ${table}\n`);
            writeStream.write(`DROP TABLE IF EXISTS "${table}" CASCADE;\n`);

            // Note: This is an extremely simplified CREATE TABLE. 
            // In a real environment, pg_dump is much better.
            // But for a portable backup, we just need the data and basic structure.
            // We'll rely on the project's existing migration/seed scripts if available,
            // but for a one-click restore, we'll try to generate CREATE TABLE.

            let createStmt = `CREATE TABLE "${table}" (\n`;
            const columns = schemaRes.rows.map(col => {
                let def = `  "${col.column_name}" ${col.data_type}`;
                if (col.is_nullable === 'NO') def += " NOT NULL";
                if (col.column_default) def += ` DEFAULT ${col.column_default}`;
                return def;
            });
            createStmt += columns.join(",\n") + "\n);\n\n";
            writeStream.write(createStmt);

            // Get Data
            const dataRes = await db.query(`SELECT * FROM "${table}"`);
            if (dataRes.rows.length > 0) {
                for (const row of dataRes.rows) {
                    const keys = Object.keys(row);
                    const values = Object.values(row).map(val => {
                        if (val === null) return 'NULL';
                        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                        if (val instanceof Date) return `'${val.toISOString()}'`;
                        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                        return val;
                    });
                    writeStream.write(`INSERT INTO "${table}" ("${keys.join('", "')}") VALUES (${values.join(', ')});\n`);
                }
            }
            writeStream.write("\n");
        }

        console.log(`Backup completed: ${backupFile}`);
    } catch (err) {
        console.error('Backup failed:', err);
    } finally {
        writeStream.end();
        process.exit(0);
    }
}

fullBackup();
