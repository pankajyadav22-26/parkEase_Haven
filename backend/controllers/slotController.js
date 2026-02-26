const Slot = require('../models/Slot');
const ParkingLot = require('../models/ParkingLot');

module.exports = {
    createSlot: async (req, res) => {
        try {
            const { slotName, slotStatus, parkingLotId } = req.body;

            if (!slotName || !slotStatus || !parkingLotId) {
                return res.status(400).json({ message: 'slotName, slotStatus, and parkingLotId are required.' });
            }

            const existingSlot = await Slot.findOne({ slotName, parkingLotId });
            if (existingSlot) {
                return res.status(409).json({ message: 'Slot with this name already exists in this parking lot.' });
            }

            const newSlot = new Slot({ slotName, slotStatus, parkingLotId });
            await newSlot.save();

            res.status(201).json({ message: 'Slot created successfully', slot: newSlot });
        } catch (err) {
            console.error('Error creating slot:', err);
            res.status(500).json({ message: 'Server error while creating slot.' });
        }
    },
    getAllSlots: async (req, res) => {
        try {
            const { parkingLotId } = req.query; 
            
            if (!parkingLotId) {
                return res.status(400).json({ message: 'parkingLotId query parameter is required.' });
            }

            const slotDocs = await Slot.find({ parkingLotId }); 
            const slots = slotDocs.map(slot => slot.toObject({ virtuals: true }));

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
        const { startTime, endTime, parkingLotId } = req.body;

        if (!startTime || !endTime || !parkingLotId) {
            return res.status(400).json({ message: "Start time, End time, and ParkingLot ID are required." });
        }

        try {
            const start = new Date(startTime);
            const end = new Date(endTime);

            const slots = await Slot.find({ parkingLotId });

            const availableSlots = slots.filter(slot => {
                if (slot.slotStatus === 'occupied') return false;
                const hasConflict = slot.reservations.some(res =>
                    (start >= res.startTime && start < res.endTime) ||
                    (end > res.startTime && end <= res.endTime) ||
                    (start <= res.startTime && end >= res.endTime)
                );
                return !hasConflict;
            }).map(slot => slot.slotName);

            res.status(200).json({ availableSlots });
        } catch (error) {
            res.status(500).json({ message: "Error fetching available slots." });
        }
    },
    addReservationToSlot: async (req, res) => {
        const { slotName, parkingLotId, userId, startTime, endTime } = req.body;

        try {
            const slot = await Slot.findOne({ slotName, parkingLotId });
            if (!slot) return res.status(404).json({ message: "Slot not found" });

            slot.reservations.push({ userId, startTime, endTime });
            await slot.save();
            res.status(200).json({ message: "Reservation added successfully" });
        } catch (error) {
            res.status(500).json({ message: "Failed to add reservation", error });
        }
    },
    updateSlotStatus: async (req, res) => {
        const { lotPrefix, updates } = req.body;

        if (!lotPrefix || !updates || !Array.isArray(updates)) {
            return res.status(400).json({ message: "Invalid payload format." });
        }

        try {
            const parkingLot = await ParkingLot.findOne({ mqttTopicPrefix: lotPrefix });
            if (!parkingLot) return res.status(404).json({ message: "Parking Lot hardware ID not found." });

            const bulkOps = updates.map(update => ({
                updateOne: {
                    filter: { slotName: update.slotName, parkingLotId: parkingLot._id },
                    update: { $set: { slotStatus: update.status } }
                }
            }));

            await Slot.bulkWrite(bulkOps);
            res.status(200).json({ message: "Slots updated successfully." });
        } catch (error) {
            res.status(500).json({ message: "Error updating slots." });
        }
    }
}