const Booking = require("../models/Booking");
const PricingDataset = require("../models/PricingDataset");
const Slot = require("../models/Slot");
const axios = require("axios");

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
  },
  calculatePrice: async (req, res) => {
    const { startTime, endTime } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ message: "Start and End time required" });
    }

    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const durationHours = (end - start) / (1000 * 60 * 60);

      if (durationHours <= 0) {
        return res.status(400).json({ message: "Invalid duration" });
      }
      const totalSlots = await Slot.countDocuments();
      const occupiedSlots = await Slot.countDocuments({
        reservations: {
          $elemMatch: {
            startTime: { $lt: end },
            endTime: { $gt: start }
          }
        }
      });

      const occupancyRate = totalSlots > 0 ? (occupiedSlots / totalSlots) : 0;

      const mlPayload = {
        hour: start.getHours(),
        day_of_week: start.getDay(),
        is_weekend: (start.getDay() === 0 || start.getDay() === 6) ? 1 : 0,
        occupancy: occupancyRate
      };

      const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';
      let hourlyRate = 50;

      try {
        const response = await axios.post(`${mlServiceUrl}/predict_price`, mlPayload);
        if (response.data && response.data.predicted_price) {
          hourlyRate = response.data.predicted_price;
        }
      } catch (mlError) {
        console.error("ML Service Error (using fallback):", mlError.message);
      }

      const totalPrice = Math.round(hourlyRate * durationHours);

      res.status(200).json({
        baseRate: hourlyRate,
        totalAmount: totalPrice,
        occupancy: occupancyRate,
        message: "Price calculated successfully"
      });

    } catch (err) {
      console.error("Price calculation failed:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  },
}