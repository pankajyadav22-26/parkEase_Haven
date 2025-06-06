const router = require('express').Router();
const paymentSaveController = require('../controllers/paymentSaveController');

router.post('/savePayment', paymentSaveController.saveTransaction);

module.exports = router;