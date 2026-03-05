const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const setupRBAC = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Ensuring RBAC tables exist...');
        
        // 1. Create Roles table
        await client.query(`
            CREATE TABLE IF NOT EXISTS roles (
                name VARCHAR(50) PRIMARY KEY,
                description TEXT,
                is_system BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Create Permissions table
        await client.query(`
            CREATE TABLE IF NOT EXISTS permissions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT
            )
        `);

        // 3. Create Role-Permissions table
        await client.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                role VARCHAR(50) REFERENCES roles(name) ON DELETE CASCADE,
                permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
                PRIMARY KEY (role, permission_id)
            )
        `);

        console.log('Inserting default roles...');
        await client.query(`
            INSERT INTO roles (name, description, is_system) VALUES
            ('Admin', 'Full system access', true),
            ('HR Manager', 'Management access for HR related tasks', true),
            ('Employee', 'Basic self-service access', true)
            ON CONFLICT (name) DO NOTHING
        `);

        console.log('Inserting granular permissions...');
        const permissions = [
            ['VIEW_DASHBOARD', 'View the main dashboard stats'],
            ['MANAGE_EMPLOYEES', 'Create, edit, and view all employee profiles'],
            ['VIEW_OWN_PROFILE', 'View own employee profile'],
            ['APPLY_LEAVE', 'Apply for leave'],
            ['APPROVE_LEAVE', 'Approve or reject leave requests'],
            ['MANAGE_PAYROLL', 'Create and view all payroll records'],
            ['VIEW_OWN_PAYROLL', 'View own payroll records'],
            ['MANAGE_DOCUMENTS', 'Upload and delete system documents'],
            ['MANAGE_RECRUITMENT', 'Manage job postings and applications'],
            ['MANAGE_PERFORMANCE', 'Manage performance reviews'],
            ['MANAGE_ATTENDANCE', 'Manage attendance records and settings'],
            ['MANAGE_ORG', 'Manage organizational structure and policies'],
            ['MANAGE_ROLES', 'Manage RBAC roles and permissions'],
            ['VIEW_AUDIT_LOGS', 'View system audit logs'],
            ['MANAGE_RESIGNATIONS', 'Manage employee resignations'],
            ['MANAGE_COMPLIANCE', 'Manage legal and statutory compliance'],
            ['MANAGE_PAYROLL_SETTINGS', 'Manage payroll configuration']
        ];

        for (const [name, desc] of permissions) {
            await client.query(
                'INSERT INTO permissions (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
                [name, desc]
            );
        }

        console.log('Assigning all permissions to Admin...');
        await client.query(`
            INSERT INTO role_permissions (role, permission_id)
            SELECT 'Admin', id FROM permissions
            ON CONFLICT DO NOTHING
        `);

        console.log('Assigning HR Manager permissions...');
        const hrPermissions = [
            'VIEW_DASHBOARD', 'MANAGE_EMPLOYEES', 'APPROVE_LEAVE', 
            'MANAGE_PAYROLL', 'MANAGE_DOCUMENTS', 'MANAGE_RECRUITMENT',
            'MANAGE_ATTENDANCE', 'MANAGE_RESIGNATIONS'
        ];
        for (const perm of hrPermissions) {
            await client.query(`
                INSERT INTO role_permissions (role, permission_id)
                SELECT 'HR Manager', id FROM permissions WHERE name = $1
                ON CONFLICT DO NOTHING
            `, [perm]);
        }

        console.log('Assigning Employee permissions...');
        const empPermissions = ['VIEW_DASHBOARD', 'VIEW_OWN_PROFILE', 'APPLY_LEAVE', 'VIEW_OWN_PAYROLL'];
        for (const perm of empPermissions) {
            await client.query(`
                INSERT INTO role_permissions (role, permission_id)
                SELECT 'Employee', id FROM permissions WHERE name = $1
                ON CONFLICT DO NOTHING
            `, [perm]);
        }

        await client.query('COMMIT');
        console.log('RBAC setup completed successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during RBAC setup:', error);
    } finally {
        client.release();
        await pool.end();
    }
};

setupRBAC();
