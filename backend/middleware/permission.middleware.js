const db = require('../config/db');

// Cache permissions to avoid hitting DB on every request (Basic implementation)
let rolePermissionsCache = {};
let lastCacheUpdate = 0;
const CACHE_TTL = 60000; // 1 minute

const refreshCache = async () => {
    try {
        const result = await db.query(`
            SELECT rp.role, p.name as permission 
            FROM role_permissions rp 
            JOIN permissions p ON rp.permission_id = p.id
        `);

        const newCache = {};
        result.rows.forEach(row => {
            if (!newCache[row.role]) newCache[row.role] = new Set();
            newCache[row.role].add(row.permission);
        });
        rolePermissionsCache = newCache;
        lastCacheUpdate = Date.now();
    } catch (error) {
        console.error('Error refreshing permission cache:', error);
    }
};

const checkPermission = (requiredPermission) => {
    return async (req, res, next) => {
        if (Date.now() - lastCacheUpdate > CACHE_TTL) {
            await refreshCache();
        }

        const userRole = req.user.role;
        const userId = req.user.id;
        const rolePerms = rolePermissionsCache[userRole];

        // Check user-level permission overrides (takes precedence over role)
        try {
            const userPermRes = await db.query(`
                SELECT up.granted 
                FROM user_permissions up
                JOIN permissions p ON up.permission_id = p.id
                WHERE up.user_id = $1 AND p.name = $2
            `, [userId, requiredPermission]);

            if (userPermRes.rows.length > 0) {
                // User-specific override exists
                if (userPermRes.rows[0].granted) {
                    return next(); // Explicitly granted
                } else {
                    console.warn(`Access Denied: User ${userId} (${userRole}) has explicit denial for ${requiredPermission}`);
                    return res.status(403).json({ message: 'Access Denied: This action is restricted for your account.' });
                }
            }
        } catch (err) {
            console.error('User permission check error:', err);
        }

        // Fall back to role-level permissions
        if (rolePerms && rolePerms.has(requiredPermission)) {
            return next();
        }

        console.warn(`Access Denied: User ${userId} (${userRole}) tried to access ${requiredPermission}`);
        return res.status(403).json({ message: 'Access Denied: Insufficient Permissions' });
    };
};

module.exports = { checkPermission };
