const cron = require('node-cron');
const axios = require('axios');
const Slot = require('../models/Slot');
const ParkingLot = require('../models/ParkingLot');
const PricingDataset = require('../models/PricingDataset');

const initScheduler = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Starting hourly ML price prediction for all locations...');

    try {
      const parkingLots = await ParkingLot.find({ isActive: true });

      for (const lot of parkingLots) {
        const totalSlots = await Slot.countDocuments({ parkingLotId: lot._id });
        const occupiedSlots = await Slot.countDocuments({
          parkingLotId: lot._id,
          slotStatus: 'occupied'
        });

        const occupancyRate = totalSlots > 0 ? (occupiedSlots / totalSlots) : 0;
        const now = new Date();

        const mlPayload = {
          hour: now.getHours(),
          day_of_week: now.getDay(),
          is_weekend: (now.getDay() === 0 || now.getDay() === 6) ? 1 : 0,
          occupancy: occupancyRate
        };

        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
        let predictedPrice = lot.basePrice;

        try {
          const response = await axios.post(`${mlServiceUrl}/predict_price`, mlPayload);
          if (response.data && response.data.predicted_price) {
            predictedPrice = response.data.predicted_price;
          }
        } catch (mlError) {
          console.error(`[CRON] ML Service Error for lot ${lot.name}:`, mlError.message);
        }

        console.log(`[CRON] Lot: ${lot.name} | Occupancy: ${(occupancyRate * 100).toFixed(1)}% | Predicted Price: ₹${predictedPrice}/hr`);
      }

    } catch (error) {
      console.error('[CRON] Failed to run ML scheduler:', error);
    }
  })
};

module.exports = initScheduler;