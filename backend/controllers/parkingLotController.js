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
    updateRoiData: async (req, res) => {
        const { mqttTopicPrefix, roiData } = req.body;

        if (!mqttTopicPrefix || !roiData) {
            return res.status(400).json({ success: false, message: "Missing mqttTopicPrefix or roiData" });
        }

        try {
            const lot = await ParkingLot.findOneAndUpdate(
                { mqttTopicPrefix: mqttTopicPrefix },
                { roiData: roiData },
                { new: true }
            );

            if (!lot) {
                return res.status(404).json({ success: false, message: "Parking lot not found" });
            }

            return res.status(200).json({
                success: true,
                message: "ROI data synced successfully",
                lotName: lot.name
            });
        } catch (error) {
            console.error("[ROI UPDATE ERROR]:", error);
            return res.status(500).json({ success: false, message: "Server error" });
        }
    },
    getRoiData: async (req, res) => {
        const { parkingLotId } = req.query;

        if (!parkingLotId || parkingLotId === "undefined") {
            return res.status(400).json({ success: false, message: "Missing parkingLotId parameter" });
        }

        try {

            if (!parkingLotId.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({ success: false, message: "Invalid parkingLotId format" });
            }

            const lot = await ParkingLot.findById(parkingLotId);

            if (!lot) {
                return res.status(404).json({ success: false, message: "Parking lot not found" });
            }

            let roiObject = {};
            if (lot.roiData) {

                roiObject = typeof lot.roiData.get === 'function'
                    ? Object.fromEntries(lot.roiData)
                    : lot.roiData;
            }

            if (Object.keys(roiObject).length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "ROI data is empty. Please run the POST request to upload the AI coordinates."
                });
            }

            return res.status(200).json({
                success: true,
                mqttTopicPrefix: lot.mqttTopicPrefix,
                roiData: roiObject
            });

        } catch (error) {
            return res.status(500).json({ success: false, message: "Server error", error: error.message });
        }
    }
}