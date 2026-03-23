const express = require('express');
const router = express.Router();
const { getPolicy, updatePolicyRates, updateFuelRate, getFuelHistory, getFuelSplitPreview } = require('../controllers/policy.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');

router.get('/', protect, getPolicy);
router.put('/rates', protect, checkPermission('MANAGE_PAYROLL'), updatePolicyRates);
router.patch('/fuel-rate', protect, updateFuelRate);
router.get('/fuel-history', protect, getFuelHistory);
router.post('/trigger-scrape', protect, async (req, res) => {
    try {
        const { scrapeFuelPrice } = require('../services/fuelScraper.service');
        const result = await scrapeFuelPrice();
        res.status(200).json({ message: 'Scrape successful', result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.post('/fuel-split-preview', protect, getFuelSplitPreview);

module.exports = router;
