import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/namakpara';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📤 Request Body:', req.body);
  }
  next();
});

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/namakpara';
console.log('🔗 Attempting MongoDB connection to:', mongoURI);

mongoose.connect(mongoURI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully!');
    console.log('📊 Database Name:', mongoose.connection.db.databaseName);
    console.log('📊 Connection Ready State:', mongoose.connection.readyState);

    // List all collections
    mongoose.connection.db.listCollections().toArray((err, collections) => {
      if (err) {
        console.error('❌ Error listing collections:', err);
      } else {
        console.log('📋 Available Collections:', collections.map(c => c.name));
      }
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('❌ Full connection error:', error);
  });

// Routes
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/expenses', expenseRoutes);

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Namakpara Backend API is running!',
    endpoints: [
      '/api/orders',
      '/api/payments', 
      '/api/expenses'
    ]
  });
});

// Database status check route
app.get('/api/status', async (req, res) => {
  try {
    const dbStatus = {
      database: mongoose.connection.db.databaseName,
      connectionState: mongoose.connection.readyState,
      collections: await mongoose.connection.db.listCollections().toArray(),
      counts: {
        orders: await mongoose.connection.db.collection('orders').countDocuments(),
        payments: await mongoose.connection.db.collection('payments').countDocuments(),
        expenses: await mongoose.connection.db.collection('expenses').countDocuments()
      }
    };

    console.log('📊 Database Status Check:', dbStatus);
    res.json(dbStatus);
  } catch (error) {
    console.error('❌ Database status check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database: ${MONGODB_URI}`);
});