const express = require("express");
const router = express.Router();
const bookingController  = require("../controllers/bookingController");

router.post("/save", bookingController.saveBooking);
router.get("/fetch/:userId", bookingController.fetchBooking);
router.post('/calculate-price', bookingController.calculatePrice);

module.exports = router;