const express = require('express');
const router = express.Router();
const { getLedger, recordExpense, deleteLedgerEntry } = require('../controllers/welfare.controller');
const { protect } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');

router.get('/ledger', protect, getLedger);
router.post('/expense', protect, checkPermission('MANAGE_EMPLOYEES'), recordExpense);
router.delete('/ledger/:id', protect, checkPermission('MANAGE_EMPLOYEES'), deleteLedgerEntry);

module.exports = router;
