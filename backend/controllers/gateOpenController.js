const Booking = require("../models/Booking");
const mqttClient = require("../utils/mqttClient");
const { waitForAck } = require("../utils/redisClient");

const PARKING_LAT = 28.6298810;
const PARKING_LNG = 76.9560120;
const MAX_DISTANCE_METERS = 200;

const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

module.exports = {
    gateOpen: async (req, res) => {
        const { reservationId, location } = req.body;

        if (!reservationId || !location?.latitude || !location?.longitude) {
            return res.status(400).json({ success: false, message: "Missing location or reservation ID" });
        }

        try {
            const booking = await Booking.findById(reservationId);
            if (!booking) {
                return res.status(404).json({ success: false, message: "Reservation not found" });
            }

            const now = new Date();
            const start = new Date(booking.startTime);
            if (now < new Date(start.getTime() - 5 * 60 * 1000)) {
                return res.status(403).json({ success: false, message: "Too early to open gate" });
            }

            if (booking.gateOpened) {
                return res.status(400).json({ success: false, message: "Gate already opened" });
            }

            const distance = getDistanceFromLatLonInMeters(
                parseFloat(location.latitude),
                parseFloat(location.longitude),
                PARKING_LAT,
                PARKING_LNG
            );



            if (distance > MAX_DISTANCE_METERS) {
                return res.status(200).json({
                    success: false,
                    message: "You are too far from the parking space.",
                });
            }

            console.log(`[GATE OPEN] Publishing MQTT command for reservationId: ${reservationId}`);

            // Subscribe BEFORE publishing to avoid race conditions
            const waitPromise = waitForAck(reservationId, 15);

            mqttClient.client.publish(
                "/esp32/gate/open",
                JSON.stringify({ reservationId, command: "open" }),
                { qos: 1 },
                async (err) => {
                    if (err) {
                        console.error("[MQTT ERROR] Failed to publish:", err.message);
                        return res.status(500).json({ success: false, message: "Failed to send gate command" });
                    }

                    console.log("[MQTT] Command published to /esp32/gate/open");

                    try {
                        const ack = await waitPromise;

                        console.log(`[REDIS ACK] Received from ESP32: ${ack}`);

                        if (ack === "success") {
                            booking.gateOpened = true;
                            await booking.save();

                            return res.status(200).json({ success: true, message: "Gate opened successfully." });
                        } else {
                            return res.status(500).json({ success: false, message: `ESP32 responded with error: ${ack}` });
                        }
                    } catch (e) {
                        console.error("[REDIS ACK ERROR] Timeout or failure:", e.message);
                        return res.status(504).json({ success: false, message: "Timeout waiting for ESP32 ack." });
                    }
                }
            );
        } catch (err) {
            console.error("[GATE OPEN ERROR]:", err);
            return res.status(500).json({ success: false, message: "Server error" });
        }
    },
};