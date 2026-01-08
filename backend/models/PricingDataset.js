const mongoose = require('mongoose');

const pricingDatasetSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  hourOfDay: Number,
  dayOfWeek: Number,
  isWeekend: Boolean,
  totalSlots: Number,
  occupiedSlots: Number,
  occupancyRate: Number,
  finalPrice: Number,
  wasBooked: Boolean
});

module.exports = mongoose.model('PricingDataset', pricingDatasetSchema);