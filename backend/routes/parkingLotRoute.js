const router = require('express').Router()
const parkingLotController = require('../controllers/parkingLotController')

router.get('/fetchall', parkingLotController.getAllParkingLots);
router.post('/create', parkingLotController.createParkingLot);
router.get('/getRoi', parkingLotController.getRoiData);
router.get('/:id', parkingLotController.getParkingLotById);
router.post('/updateRoi', parkingLotController.updateRoiData);

module.exports = router