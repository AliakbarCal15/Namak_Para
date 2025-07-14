
const mongoose = require('mongoose');

const packageItemSchema = new mongoose.Schema({
  size: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  weight: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true
  },
  deliveryDate: {
    type: Date,
    required: true
  },
  packages: [packageItemSchema],
  totalWeight: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  priceType: {
    type: String,
    enum: ['retail', 'wholesale'],
    default: 'retail'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
