const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user (Admin mainly)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        res.status(400);
        throw new Error('Please add all fields');
    }

    try {
        // Check if user exists
        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            res.status(400);
            throw new Error('User already exists');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
            [name, email, hashedPassword, role]
        );

        res.status(201).json({
            ...newUser.rows[0],
            token: generateToken(newUser.rows[0].id, newUser.rows[0].role),
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Case-insensitive email search
        const userRes = await db.query('SELECT * FROM users WHERE email ILIKE $1', [email]);
        if (userRes.rows.length === 0) return res.status(400).json({ message: 'Invalid credentials' });

        const user = userRes.rows[0];

        if (await bcrypt.compare(password, user.password)) {
            // Check if account is activated
            if (user.activation_token && !user.force_password_change) {
                return res.status(401).json({ message: 'Account not activated. Please use the link sent to your email.' });
            }

            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                force_password_change: user.force_password_change,
                token: generateToken(user.id, user.role),
                profile_picture: user.profile_picture
            });
        } else {
            res.status(400).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Activate account via token
// @route   POST /api/auth/activate
// @access  Public
const activateAccount = async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        // 1. Find user with token and check expiry
        const userRes = await db.query(
            'SELECT * FROM users WHERE activation_token = $1 AND activation_expires_at > CURRENT_TIMESTAMP',
            [token]
        );

        if (userRes.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired activation token' });
        }

        const user = userRes.rows[0];

        // 2. Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 3. Update user: Clear token, set password, clear force_change (since they just set it)
        await db.query(
            'UPDATE users SET password = $1, activation_token = NULL, force_password_change = FALSE WHERE id = $2',
            [hashedPassword, user.id]
        );

        res.status(200).json({ message: 'Account activated successfully. You can now login.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Change password (Internal/Mandatory)
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
        const userRes = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const user = userRes.rows[0];

        if (await bcrypt.compare(oldPassword, user.password)) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            await db.query('UPDATE users SET password = $1, force_password_change = FALSE WHERE id = $2', [hashedPassword, req.user.id]);
            res.status(200).json({ message: 'Password updated successfully' });
        } else {
            res.status(400).json({ message: 'Incorrect old password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const userRes = await db.query(
            'SELECT id, name, email, role, force_password_change, profile_picture FROM users WHERE id = $1',
            [req.user.id]
        );
        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(userRes.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Upload profile picture
// @route   POST /api/auth/profile-picture
// @access  Private
const uploadProfilePicture = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const imageUrl = `/uploads/${req.file.filename}`;

        await db.query(
            'UPDATE users SET profile_picture = $1 WHERE id = $2',
            [imageUrl, req.user.id]
        );

        res.status(200).json({
            message: 'Profile picture updated successfully',
            profile_picture: imageUrl
        });
    } catch (error) {
        console.error('Profile Picture Upload Error:', error);
        res.status(500).json({ message: 'Internal server error during upload update' });
    }
};

// @desc    Upload profile picture for a specific user (Admin/HR)
// @route   POST /api/auth/profile-picture/:userId
// @access  Private
const uploadProfilePictureByAdmin = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const imageUrl = `/uploads/${req.file.filename}`;
        const userId = req.params.userId;

        console.log(`Admin ${req.user.id} setting profile picture for user ${userId}: ${imageUrl}`);

        const result = await db.query(
            'UPDATE users SET profile_picture = $1 WHERE id = $2 RETURNING id',
            [imageUrl, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            message: 'Profile picture updated successfully',
            profile_picture: imageUrl
        });
    } catch (error) {
        console.error('Admin Profile Picture Upload Error:', error);
        res.status(500).json({ message: 'Internal server error during upload update' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    activateAccount,
    changePassword,
    getMe,
    uploadProfilePicture,
    uploadProfilePictureByAdmin
};
