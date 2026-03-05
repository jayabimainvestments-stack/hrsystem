const db = require('../config/db');

/**
 * Enterprise Audit Middleware
 * Captures user actions and data changes (Old vs New)
 */
const auditLog = (action, entity) => {
    return async (req, res, next) => {
        let oldValues = null;
        const entityId = req.params.id || null;

        // 1. Capture Old Values for Updates/Deletes
        if (entityId && ['PUT', 'PATCH', 'DELETE'].includes(req.method) && entity) {
            try {
                const result = await db.query(`SELECT * FROM ${entity} WHERE id = $1`, [entityId]);
                if (result.rows.length > 0) {
                    oldValues = result.rows[0];
                }
            } catch (err) {
                console.warn(`Audit: Could not fetch old values for ${entity}:${entityId}`, err.message);
            }
        }

        // 2. Intercept Response to Capture New Values & Success Status
        const originalSend = res.json;
        let responseBody;

        res.json = function (body) {
            responseBody = body;
            originalSend.call(this, body);
        };

        res.on('finish', async () => {
            // Only log successful operations (2xx) or specific failures if deemed necessary
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    const userId = req.user ? req.user.id : null;
                    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
                    const userAgent = req.headers['user-agent'];

                    // Determine entity ID from response if not in params (e.g., on CREATE)
                    const finalEntityId = entityId || (responseBody && responseBody.id) || null;
                    const newValues = ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : null;

                    await db.query(
                        `INSERT INTO audit_logs (user_id, action, entity, entity_id, old_values, new_values, ip_address, user_agent) 
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            userId,
                            action,
                            entity,
                            finalEntityId,
                            oldValues ? JSON.stringify(oldValues) : null,
                            newValues ? JSON.stringify(newValues) : null,
                            ip,
                            userAgent
                        ]
                    );
                } catch (err) {
                    console.error('Audit Log Insertion Error:', err.message);
                }
            }
        });

        next();
    };
};

module.exports = auditLog;
