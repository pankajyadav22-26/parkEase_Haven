const ParkingLot = require('../models/ParkingLot');
const { isEsp32Online } = require("../utils/mqttClient");

module.exports = {
  getEsp32Status: async (req, res) => {
    try {
      const { parkingLotId } = req.query;

      if (!parkingLotId) {
        return res.status(400).json({ success: false, message: "parkingLotId is required" });
      }

      const lot = await ParkingLot.findById(parkingLotId);
      if (!lot) {
        return res.status(404).json({ success: false, message: "Parking lot not found" });
      }

      const online = isEsp32Online(lot.mqttTopicPrefix);
      
      res.status(200).json({
        success: true,
        status: online ? "online" : "offline"
      });
      
    } catch (err) {
      console.error("Error fetching ESP32 status:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
};