
const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder
} = require('../controllers/orderController');

// POST /api/orders - Create new order
router.post('/', createOrder);

// GET /api/orders - Get all orders
router.get('/', getOrders);

// GET /api/orders/:id - Get order by ID
router.get('/:id', getOrderById);

// PUT /api/orders/:id - Update order
router.put('/:id', updateOrder);

// DELETE /api/orders/:id - Delete order
router.delete('/:id', deleteOrder);

module.exports = router;
