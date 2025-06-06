const router = require('express').Router()
const esp32Controller = require('../controllers/esp32Controller')

router.get('/ping-esp32', esp32Controller.esp32Check)

module.exports = router