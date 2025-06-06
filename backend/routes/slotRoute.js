const router = require('express').Router()
const slotController = require('../controllers/slotController')

router.post('/createSlot', slotController.createSlot)
router.get('/fetchSlot', slotController.getAllSlots)
router.post('/fetchAvailableSlot', slotController.getAvailableSlots)
router.post('/addReservationToSlot', slotController.addReservationToSlot)
router.post('/updateSlotStatus', slotController.updateSlotStatus)

module.exports = router