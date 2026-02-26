const ParkingLot = require('../models/ParkingLot');

module.exports = {
    getAllParkingLots: async (req, res) => {
        try {
            const lots = await ParkingLot.find({ isActive: true }).select('-__v');
            res.status(200).json({ success: true, lots });
        } catch (error) {
            console.error("Error fetching parking lots:", error);
            res.status(500).json({ success: false, message: "Server error" });
        }
    },
    createParkingLot: async (req, res) => {
        try {
            const newLot = new ParkingLot(req.body);
            await newLot.save();
            res.status(201).json({ success: true, lot: newLot });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    getParkingLotById: async (req, res) => {
        try {
            const lot = await ParkingLot.findById(req.params.id);
            if (!lot) return res.status(404).json({ success: false, message: "Lot not found" });
            res.status(200).json({ success: true, lot });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
}