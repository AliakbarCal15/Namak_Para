
import Payment from '../models/paymentModel.js';

// Create new payment
export const createPayment = async (req, res) => {
  try {
    console.log('🟢 Payment CREATE Request Body:', req.body);
    console.log('🟢 Payment CREATE Request Headers:', req.headers);
    
    const payment = new Payment(req.body);
    const savedPayment = await payment.save();
    
    console.log('✅ Payment SAVED to MongoDB:', savedPayment);
    console.log('📊 Payment Collection Count:', await Payment.countDocuments());
    
    res.status(201).json(savedPayment);
  } catch (error) {
    console.error('❌ Payment CREATE Error:', error.message);
    console.error('❌ Full Error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Get all payments
export const getPayments = async (req, res) => {
  try {
    console.log('🔍 GET Payments Request from:', req.ip);
    
    const payments = await Payment.find()
      .populate('orderId', 'customerName totalAmount')
      .sort({ date: -1 });
    
    console.log('📋 Found Payments Count:', payments.length);
    console.log('📋 Latest 3 Payments:', payments.slice(0, 3));
    
    res.json(payments);
  } catch (error) {
    console.error('❌ GET Payments Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get payment by ID
export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('orderId');
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update payment
export const updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete payment
export const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
