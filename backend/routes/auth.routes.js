const express = require('express');
const router = express.Router();
const { registerUser, loginUser, activateAccount, changePassword, getMe, uploadProfilePicture, uploadProfilePictureByAdmin } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/activate', activateAccount);
router.post('/change-password', protect, changePassword);
router.get('/me', protect, getMe);
router.post('/profile-picture', protect, upload.single('image'), uploadProfilePicture);
router.post('/profile-picture/:userId', protect, checkRole(['Admin', 'HR Manager']), upload.single('image'), uploadProfilePictureByAdmin);

module.exports = router;
