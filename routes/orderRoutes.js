
import express from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder
} from '../controllers/orderController.js';

const router = express.Router();

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

export default router;
