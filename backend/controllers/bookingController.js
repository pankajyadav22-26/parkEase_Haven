const Booking = require("../models/Booking");

module.exports = {
  saveBooking: async (req, res) => {
    const { userId, name, carNumber, slot, startTime, endTime, amount } = req.body;

    if (!userId || !name || !carNumber || !slot || !startTime || !endTime || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    try {
      const booking = new Booking({
        userId,
        name,
        carNumber,
        slot,
        startTime,
        endTime,
        amount,
      });

      await booking.save();

      res.status(201).json({ message: "Booking saved successfully" });
    } catch (err) {
      console.error("Booking save failed:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  fetchBooking: async (req, res) => {
    try {
      const bookings = await Booking.find({ userId: req.params.userId });
      res.json(bookings);
    } catch (err) {
      res.status(500).json({ error: 'Something went wrong' });
    }
  }
}

