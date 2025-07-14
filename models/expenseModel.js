
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  item: {
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
  isExtra: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['raw_material', 'gas', 'packaging', 'transport', 'other'],
    default: 'raw_material'
  },
  remarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);
