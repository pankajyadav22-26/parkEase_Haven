const Booking = require("../models/Booking");
const PricingDataset = require("../models/PricingDataset");
const Slot = require("../models/Slot");

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

      try {
        const now = new Date();
        const totalSlots = await Slot.countDocuments();
        const occupiedSlots = await Slot.countDocuments({ slotStatus: "occupied" });

        await PricingDataset.create({
          timestamp: now,
          hourOfDay: now.getHours(),
          dayOfWeek: now.getDay(),
          isWeekend: (now.getDay() === 0 || now.getDay() === 6),
          totalSlots,
          occupiedSlots,
          occupancyRate: totalSlots > 0 ? (occupiedSlots / totalSlots) : 0,
          finalPrice: amount,
          wasBooked: true
        });
      } catch (logError) {
        console.error("Failed to log dataset:", logError);
      }

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

