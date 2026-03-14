const router = require('express').Router()
const parkingLotController = require('../controllers/parkingLotController')

const { verifyTokenAndAdmin } = require('../middleware/verifyToken');

router.get('/fetchall', parkingLotController.getAllParkingLots);
router.post('/create', verifyTokenAndAdmin, parkingLotController.createParkingLot);
router.get('/getRoi', parkingLotController.getRoiData);
router.get('/:id', parkingLotController.getParkingLotById);
router.post('/updateRoi', verifyTokenAndAdmin, parkingLotController.updateRoiData);

module.exports = router