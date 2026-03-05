const checkRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403);
            throw new Error('Not authorized to access this route');
        }
        next();
    };
};

module.exports = { checkRole };
