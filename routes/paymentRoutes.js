
const express = require('express');
const router = express.Router();
const {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment
} = require('../controllers/paymentController');

// POST /api/payments - Create new payment
router.post('/', createPayment);

// GET /api/payments - Get all payments
router.get('/', getPayments);

// GET /api/payments/:id - Get payment by ID
router.get('/:id', getPaymentById);

// PUT /api/payments/:id - Update payment
router.put('/:id', updatePayment);

// DELETE /api/payments/:id - Delete payment
router.delete('/:id', deletePayment);

module.exports = router;
