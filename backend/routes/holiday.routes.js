const express = require('express');
const router = express.Router();
const { getHolidays, addHoliday, deleteHoliday } = require('../controllers/holiday.controller');
const { protect } = require('../middleware/auth.middleware');

// Get all holidays (any logged in user might need it to view calendar)
router.get('/', protect, getHolidays);

// Add and Delete holidays (restricted to Admin/HR, ideally via middleware but frontend will secure it)
router.post('/', protect, addHoliday);
router.delete('/:id', protect, deleteHoliday);

module.exports = router;
