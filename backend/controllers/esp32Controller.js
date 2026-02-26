const { getAsync } = require('../utils/redisClient');
const ParkingLot = require('../models/ParkingLot');

module.exports = {
  getEsp32Status: async (req, res) => {
    try {
      const { parkingLotId } = req.query;

      if (!parkingLotId) {
        return res.status(400).json({ message: "parkingLotId is required" });
      }
      const lot = await ParkingLot.findById(parkingLotId);
      if (!lot) {
        return res.status(404).json({ message: "Parking lot not found" });
      }

      const statusKey = `esp32_status_${lot.mqttTopicPrefix}`;
      const status = await getAsync(statusKey);

      res.status(200).json({
        success: true,
        status: status === "online" ? "online" : "offline"
      });
    } catch (err) {
      console.error("Error fetching ESP32 status:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
}