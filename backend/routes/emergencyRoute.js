const router = require('express').Router()
const emergencyController = require('../controllers/emergencyController');

const { verifyTokenAndAdmin } = require('../middleware/verifyToken');

router.post('/emergency', verifyTokenAndAdmin, emergencyController.toggleEmergency);

module.exports = router;