const ParkingLot = require('../models/ParkingLot');
const Booking = require('../models/Booking');

const User = require('../models/User');

const { client: mqttClient } = require('../utils/mqttClient');
const axios = require('axios');

const sendEmergencyPushNotification = async (userIds, message) => {
    try {

        const users = await User.find({ _id: { $in: userIds } });

        const messages = [];
        for (let user of users) {

            if (user.expoPushToken) {
                messages.push({
                    to: user.expoPushToken,
                    sound: 'default',
                    title: '🚨 URGENT: EVACUATION ORDER',
                    body: message,
                    data: { isEmergency: true },
                    priority: 'high',
                });
            }
        }

        if (messages.length > 0) {
            await axios.post('https://exp.host/--/api/v2/push/send', messages, {
                headers: {
                    'Accept': 'application/json',
                    'Accept-encoding': 'application/json',
                    'Content-Type': 'application/json',
                }
            });
            console.log(`[PUSH NOTIFICATION] Sent emergency alert to ${messages.length} users.`);
        }
    } catch (error) {
        console.error("[PUSH NOTIFICATION ERROR]:", error);
    }
};

exports.toggleEmergency = async (req, res) => {

    const { parkingLotIds, action } = req.body;

    if (!['TRIGGER', 'RESOLVE'].includes(action)) {
        return res.status(400).json({ success: false, message: "Invalid action. Use TRIGGER or RESOLVE." });
    }

    try {
        let isEmergency = action === 'TRIGGER';
        const payload = JSON.stringify({ command: isEmergency ? "EMERGENCY_OPEN" : "EMERGENCY_CLEARED" });
        let affectedLots = [];

        if (parkingLotIds === 'ALL' || (Array.isArray(parkingLotIds) && parkingLotIds.includes('ALL'))) {
            await ParkingLot.updateMany({}, { isEmergencyMode: isEmergency });
            mqttClient.publish(`/esp32/gate/emergency/global`, payload);

            affectedLots = await ParkingLot.find({}).select('_id name');

            res.status(200).json({
                success: true,
                message: `GLOBAL emergency mode ${isEmergency ? 'ACTIVATED' : 'RESOLVED'} for all lots.`
            });
        }

        else if (Array.isArray(parkingLotIds) && parkingLotIds.length > 0) {
            await ParkingLot.updateMany({ _id: { $in: parkingLotIds } }, { isEmergencyMode: isEmergency });

            affectedLots = await ParkingLot.find({ _id: { $in: parkingLotIds } }).select('_id name mqttTopicPrefix');

            affectedLots.forEach(lot => {
                const topic = `/esp32/gate/emergency/lot/${lot.mqttTopicPrefix}`;
                mqttClient.publish(topic, payload);
            });

            res.status(200).json({
                success: true,
                message: `Emergency mode ${isEmergency ? 'ACTIVATED' : 'RESOLVED'} for ${affectedLots.length} lot(s).`
            });
        } else {
            return res.status(400).json({ success: false, message: "Provide a valid array of parkingLotIds or 'ALL'" });
        }

        if (isEmergency && affectedLots.length > 0) {
            const lotIds = affectedLots.map(lot => lot._id);
            const now = new Date();

            const activeBookings = await Booking.find({
                parkingLotId: { $in: lotIds },
                endTime: { $gte: now }

            }).select('userId parkingLotId');

            if (activeBookings.length > 0) {

                const uniqueUserIds = [...new Set(activeBookings.map(b => b.userId.toString()))];

                const lotNames = affectedLots.map(l => l.name).join(", ");
                const alertMessage = `Do not proceed to ${lotNames}. An emergency evacuation is active. All gates are locked open.`;

                sendEmergencyPushNotification(uniqueUserIds, alertMessage);
            }
        }

    } catch (error) {
        console.error("[EMERGENCY TOGGLE ERROR]:", error);

        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: "Server Error" });
        }
    }
};