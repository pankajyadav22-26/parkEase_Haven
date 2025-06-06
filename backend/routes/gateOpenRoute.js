const express = require("express");
const router = express.Router();
const gateOpenController = require('../controllers/gateOpenController');

router.post("/open", gateOpenController.gateOpen);

module.exports = router;