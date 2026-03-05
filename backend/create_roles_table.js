const db = require('./config/db');

const createRolesTable = async () => {
    try {
        console.log('--- 🛠️ CREATING ROLES TABLE ---');

        // 1. Create Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS roles (
                name VARCHAR(50) PRIMARY KEY,
                description TEXT,
                is_system BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Table "roles" created/verified.');

        // 2. Seed Default Roles
        const defaultRoles = [
            {
                name: 'Admin',
                description: 'Full system access. Can manage users, payroll, leaves, and configurations.',
                is_system: true
            },
            {
                name: 'HR Manager',
                description: 'Operational access. Can approve leaves, manage employees, and process payroll.',
                is_system: true
            },
            {
                name: 'Employee',
                description: 'Self-service access. Can view own profile, payslips, and request leave.',
                is_system: true
            }
        ];

        for (const role of defaultRoles) {
            await db.query(`
                INSERT INTO roles (name, description, is_system)
                VALUES ($1, $2, $3)
                ON CONFLICT (name) DO UPDATE 
                SET description = EXCLUDED.description, is_system = EXCLUDED.is_system;
            `, [role.name, role.description, role.is_system]);
            console.log(`   - Seeded role: ${role.name}`);
        }

        console.log('✅ Default roles seeded.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

createRolesTable();
