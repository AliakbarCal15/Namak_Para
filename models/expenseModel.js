
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  itemName: {
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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);
