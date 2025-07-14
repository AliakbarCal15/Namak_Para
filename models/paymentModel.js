
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: false
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'bank', 'other'],
    default: 'cash'
  },
  remarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
