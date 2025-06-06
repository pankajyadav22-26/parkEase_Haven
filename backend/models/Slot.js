const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    }
}, { _id: false });

const SlotSchema = new mongoose.Schema({
    slotName: {
        type: String,
        required: true
    },
    slotStatus: {
        type: String,
        enum: ['available', 'reserved', 'occupied'],
        default: 'available'
    },
    reservations: [ReservationSchema]
});

SlotSchema.virtual('currentStatus').get(function () {
    const now = new Date();

    if (this.slotStatus === 'occupied') return 'occupied';

    const hasActiveReservation = this.reservations.some(res =>
        res.startTime <= now && res.endTime >= now
    );

    return hasActiveReservation ? 'reserved' : 'available';
});

SlotSchema.set('toObject', { virtuals: true });
SlotSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Slot', SlotSchema);