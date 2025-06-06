const Slot = require('../models/Slot');

module.exports = {
    createSlot: async (req, res) => {
        try {
            const { slotName, slotStatus } = req.body;

            // Basic validation
            if (!slotName || !slotStatus) {
                return res.status(400).json({ message: 'slotName and slotStatus are required.' });
            }

            // Check if slotName already exists (optional)
            const existingSlot = await Slot.findOne({ slotName });
            if (existingSlot) {
                return res.status(409).json({ message: 'Slot with this name already exists.' });
            }

            // Create and save slot
            const newSlot = new Slot({ slotName, slotStatus });
            await newSlot.save();

            res.status(201).json({ message: 'Slot created successfully', slot: newSlot });
        } catch (err) {
            console.error('Error creating slot:', err);
            res.status(500).json({ message: 'Server error while creating slot.' });
        }
    },
    getAllSlots: async (req, res) => {
        try {
            const slotDocs = await Slot.find(); // full Mongoose docs
            const slots = slotDocs.map(slot => slot.toObject({ virtuals: true }));

            // console.log("With virtuals:", slots.map(s => ({
            //     slotName: s.slotName,
            //     slotStatus: s.slotStatus,
            //     currentStatus: s.currentStatus
            // })));

            res.status(200).json({
                message: 'Slots fetched successfully',
                slots
            });
        } catch (err) {
            console.error('Error fetching slots:', err);
            res.status(500).json({ message: 'Server error while fetching slots.' });
        }
    },
    getAvailableSlots: async (req, res) => {
        try {
            const { startTime, endTime } = req.body;

            if (!startTime || !endTime) {
                return res.status(400).json({ message: "Start time and End time are required." });
            }

            if (new Date(endTime) <= new Date(startTime)) {
                return res.status(400).json({ message: "End time must be after Start time." });
            }

            const start = new Date(startTime);
            const end = new Date(endTime);

            const availableSlots = await Slot.find({
                $nor: [
                    {
                        reservations: {
                            $elemMatch: {
                                $or: [
                                    {
                                        startTime: { $lt: end },
                                        endTime: { $gt: start }
                                    }
                                ]
                            }
                        }
                    }
                ]
            });

            const slotNames = availableSlots.map(slot => slot.slotName);

            return res.status(200).json({ availableSlots: slotNames });
        } catch (error) {
            console.error("Error fetching available slots:", error);
            return res.status(500).json({ message: "Server error while fetching slots." });
        }
    },
    addReservationToSlot: async (req, res) => {
        try {
            const { slotName, userId, startTime, endTime } = req.body;

            const slot = await Slot.findOne({ slotName });

            if (!slot) {
                return res.status(404).json({ message: "Slot not found" });
            }

            slot.reservations.push({
                userId,
                startTime,
                endTime,
            });

            await slot.save();

            res.status(200).json({ message: "Reservation added to slot" });
        } catch (err) {
            console.error("Failed to update slot reservation", err);
            res.status(500).json({ message: "Internal Server Error" });
        }
    },
    updateSlotStatus: async (req, res) => {
        try {
          const updates = Array.isArray(req.body) ? req.body : [req.body]; // allow single or multiple
      
          const results = [];
      
          for (const { slotName, status } of updates) {
            const slot = await Slot.findOne({ slotName });
      
            if (!slot) {
              results.push({ slotName, success: false, message: "Slot not found" });
              continue;
            }
      
            slot.slotStatus = status;
            await slot.save();
            results.push({ slotName, success: true, message: `Updated to ${status}` });
          }
      
          res.status(200).json({ message: "Batch update completed", results });
        } catch (err) {
          console.error("Failed to update slot status", err);
          res.status(500).json({ message: "Internal Server Error" });
        }
      }
}