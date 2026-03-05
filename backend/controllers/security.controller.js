const db = require('../config/db');

// @desc    Get all unique roles and their permissions
// @route   GET /api/security/roles
// @access  Private (Admin)
const getRoles = async (req, res) => {
    try {
        // Fetch roles from the dedicated 'roles' table and join with permissions
        const result = await db.query(`
            SELECT 
                r.name as role, 
                r.description, 
                r.is_system,
                p.id as permission_id, 
                p.name as permission_name
            FROM roles r
            LEFT JOIN role_permissions rp ON r.name = rp.role
            LEFT JOIN permissions p ON rp.permission_id = p.id
            ORDER BY r.name, p.name
        `);

        // Group by Role
        const rolesMap = {};
        result.rows.forEach(row => {
            if (!rolesMap[row.role]) {
                rolesMap[row.role] = {
                    id: row.role, // Frontend uses 'id' as key
                    name: row.role,
                    description: row.description,
                    is_system: row.is_system,
                    permissions: []
                };
            }
            if (row.permission_id) {
                rolesMap[row.role].permissions.push({
                    id: row.permission_id,
                    name: row.permission_name
                });
            }
        });

        res.status(200).json(Object.values(rolesMap));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all available permissions
// @route   GET /api/security/permissions
// @access  Private (Admin)
const getAllPermissions = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM permissions ORDER BY name');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new role
// @route   POST /api/security/roles
// @access  Private (Admin)
const createRole = async (req, res) => {
    const { name, description, permissions } = req.body; // permissions is array of IDs

    if (!name) return res.status(400).json({ message: 'Role name is required' });

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create Role
        await client.query(
            'INSERT INTO roles (name, description) VALUES ($1, $2)',
            [name, description || '']
        );

        // 2. Assign Permissions
        if (permissions && permissions.length > 0) {
            for (const permId of permissions) {
                await client.query(
                    'INSERT INTO role_permissions (role, permission_id) VALUES ($1, $2)',
                    [name, permId]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Role created successfully', role: { name, description } });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};

// @desc    Update permissions for a role
// @route   PUT /api/security/roles/:role
// @access  Private (Admin)
const updateRolePermissions = async (req, res) => {
    const { role } = req.params;
    const { permissionIds, permissions, description, name } = req.body; // Array of Permission IDs
    const finalPermissionIds = permissionIds || permissions;

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Update Description (and Name if we supported renaming, which is complex due to PK)
        if (description !== undefined) {
            await client.query('UPDATE roles SET description = $1 WHERE name = $2', [description, role]);
        }

        // 2. Update Permissions
        if (Array.isArray(finalPermissionIds)) {
            // Remove all existing permissions
            await client.query('DELETE FROM role_permissions WHERE role = $1', [role]);

            // Insert new permissions
            for (const permId of finalPermissionIds) {
                await client.query(
                    'INSERT INTO role_permissions (role, permission_id) VALUES ($1, $2)',
                    [role, permId]
                );
            }
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Role updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};


// @desc    Get user-level permission overrides for a specific user
// @route   GET /api/security/users/:userId/permissions
// @access  Private (Admin)
const getUserPermissions = async (req, res) => {
    const { userId } = req.params;
    try {
        // Get all permissions, and mark which ones are overridden for this user
        const result = await db.query(`
            SELECT p.id, p.name, p.description,
                   up.granted as user_override
            FROM permissions p
            LEFT JOIN user_permissions up ON up.permission_id = p.id AND up.user_id = $1
            ORDER BY p.name
        `, [userId]);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Set user-level permission overrides
// @route   PUT /api/security/users/:userId/permissions
// @access  Private (Admin)
const updateUserPermissions = async (req, res) => {
    const { userId } = req.params;
    const { overrides } = req.body; // Array of { permission_id, granted }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        // Remove all existing overrides for this user
        await client.query('DELETE FROM user_permissions WHERE user_id = $1', [userId]);
        // Insert new overrides
        for (const override of (overrides || [])) {
            await client.query(
                'INSERT INTO user_permissions (user_id, permission_id, granted) VALUES ($1, $2, $3)',
                [userId, override.permission_id, override.granted]
            );
        }
        await client.query('COMMIT');
        res.status(200).json({ message: 'User permissions updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};

module.exports = {
    getRoles,
    getAllPermissions,
    createRole,
    updateRolePermissions,
    getUserPermissions,
    updateUserPermissions
};
