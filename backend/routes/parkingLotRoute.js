const router = require('express').Router()
const parkingLotController = require('../controllers/parkingLotController')

router.get('/fetchall', parkingLotController.getAllParkingLots);
router.post('/create', parkingLotController.createParkingLot);
router.get('/:id', parkingLotController.getParkingLotById);

module.exports = router