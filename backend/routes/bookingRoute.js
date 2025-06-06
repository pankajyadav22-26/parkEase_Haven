const express = require("express");
const router = express.Router();
const bookingController  = require("../controllers/bookingController");

router.post("/save", bookingController.saveBooking);
router.get("/fetch/:userId", bookingController.fetchBooking);

module.exports = router;