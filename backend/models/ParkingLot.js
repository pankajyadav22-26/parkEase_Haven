const mongoose = require('mongoose');

const ParkingLotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'], 
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  totalSlots: {
    type: Number,
    required: true
  },
  basePrice: {
    type: Number,
    default: 50
  },
  mqttTopicPrefix: {
    type: String,
    required: true, 
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

ParkingLotSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('ParkingLot', ParkingLotSchema);