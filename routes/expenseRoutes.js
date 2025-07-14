
import express from 'express';
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
} from '../controllers/expenseController.js';

const router = express.Router();

// POST /api/expenses - Create new expense
router.post('/', createExpense);

// GET /api/expenses - Get all expenses
router.get('/', getExpenses);

// GET /api/expenses/:id - Get expense by ID
router.get('/:id', getExpenseById);

// PUT /api/expenses/:id - Update expense
router.put('/:id', updateExpense);

// DELETE /api/expenses/:id - Delete expense
router.delete('/:id', deleteExpense);

export default router;
