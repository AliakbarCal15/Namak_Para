
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, TrendingUp, TrendingDown, DollarSign, X } from 'lucide-react';

// ==========================================
// 💰 PAYMENT TRACKER TYPES & INTERFACES
// ==========================================

interface Order {
  id: string;
  customerName: string;
  deliveryDate: string;
  packages: PackageItem[];
  totalWeight: number;
  totalAmount: number;
  status: 'pending' | 'completed';
  productVariant: 'sada' | 'peri-peri' | 'cheese';
  createdAt: string;
}

interface PackageItem {
  size: number;
  quantity: number;
  weight: number;
  amount: number;
}

interface IncomeEntry {
  id: string;
  customerName: string;
  amount: number;
  date: string;
  orderSize?: string;
  remarks?: string;
  orderId?: string;
  createdAt: string;
}

interface ExpenseEntry {
  id: string;
  item: string;
  amount: number;
  date: string;
  remarks?: string;
  isExtra: boolean;
  createdAt: string;
}

// Configuration constants
const CONFIG = {
  PACKET_SIZES: [50, 100, 250, 500, 1000],
  YIELD_RATIO: 1.4,
  GAS_COST_PER_MINUTE: 0.5,
  PRODUCT_VARIANTS: {
    'sada': 'Sada Namak Para',
    'peri-peri': 'Peri Peri Namak Para', 
    'cheese': 'Cheese Namak Para'
  }
};

// ==========================================
// 🌐 API INTEGRATION HELPER FUNCTIONS
// ==========================================

const API_BASE_URL = 'http://localhost:5000/api';

// API Helper Functions
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    console.log(`🌐 API Request: ${options.method || 'GET'} ${endpoint}`);
    if (options.body) {
      console.log('📤 Request Body:', JSON.parse(options.body as string));
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📥 API Response:', data);
    return data;
  } catch (error) {
    console.error('❌ API Error:', error);
    throw error;
  }
};

// Orders API
const ordersApi = {
  getAll: () => apiRequest('/orders'),
  create: (orderData: any) => apiRequest('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  }),
  update: (id: string, orderData: any) => apiRequest(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(orderData),
  }),
  delete: (id: string) => apiRequest(`/orders/${id}`, {
    method: 'DELETE',
  }),
};

// Payments API
const paymentsApi = {
  getAll: () => apiRequest('/payments'),
  create: (paymentData: any) => apiRequest('/payments', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  }),
  update: (id: string, paymentData: any) => apiRequest(`/payments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(paymentData),
  }),
  delete: (id: string) => apiRequest(`/payments/${id}`, {
    method: 'DELETE',
  }),
};

// Expenses API
const expensesApi = {
  getAll: () => apiRequest('/expenses'),
  create: (expenseData: any) => apiRequest('/expenses', {
    method: 'POST',
    body: JSON.stringify(expenseData),
  }),
  update: (id: string, expenseData: any) => apiRequest(`/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(expenseData),
  }),
  delete: (id: string) => apiRequest(`/expenses/${id}`, {
    method: 'DELETE',
  }),
};

// ==========================================
// 🗄️ DATA MANAGER CLASS (API + localStorage hybrid)
// ==========================================

class PaymentDataManager {
  // Orders management - API + localStorage hybrid
  static async getOrders(): Promise<Order[]> {
    try {
      const apiOrders = await ordersApi.getAll();
      return apiOrders.map((order: any) => ({
        id: order._id,
        customerName: order.customerName,
        deliveryDate: order.deliveryDate,
        packages: order.packages || [],
        totalWeight: order.totalWeight,
        totalAmount: order.totalAmount,
        status: order.status,
        productVariant: order.productVariant || 'sada',
        createdAt: order.createdAt || order.date
      }));
    } catch (error) {
      console.error('❌ Failed to fetch orders from API, using localStorage:', error);
      const stored = localStorage.getItem('payment_tracker_orders');
      return stored ? JSON.parse(stored) : [];
    }
  }

  static async addOrder(order: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
    try {
      const orderData = {
        customerName: order.customerName,
        deliveryDate: order.deliveryDate,
        packages: order.packages,
        totalWeight: order.totalWeight,
        totalAmount: order.totalAmount,
        status: order.status,
        productVariant: order.productVariant,
        date: new Date().toISOString()
      };

      const createdOrder = await ordersApi.create(orderData);
      
      return {
        id: createdOrder._id,
        customerName: createdOrder.customerName,
        deliveryDate: createdOrder.deliveryDate,
        packages: createdOrder.packages || [],
        totalWeight: createdOrder.totalWeight,
        totalAmount: createdOrder.totalAmount,
        status: createdOrder.status,
        productVariant: createdOrder.productVariant || 'sada',
        createdAt: createdOrder.createdAt || createdOrder.date
      };
    } catch (error) {
      console.error('❌ Failed to create order via API, using localStorage:', error);
      // Fallback to localStorage
      const orders = await PaymentDataManager.getOrders();
      const newOrder: Order = {
        ...order,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        createdAt: new Date().toISOString()
      };
      
      orders.push(newOrder);
      localStorage.setItem('payment_tracker_orders', JSON.stringify(orders));
      return newOrder;
    }
  }

  static async deleteOrder(id: string): Promise<void> {
    try {
      await ordersApi.delete(id);
    } catch (error) {
      console.error('❌ Failed to delete order via API, using localStorage:', error);
      const orders = await PaymentDataManager.getOrders();
      const filtered = orders.filter(order => order.id !== id);
      localStorage.setItem('payment_tracker_orders', JSON.stringify(filtered));
    }
  }

  static async updateOrderStatus(id: string, status: 'pending' | 'completed'): Promise<void> {
    try {
      await ordersApi.update(id, { status });
    } catch (error) {
      console.error('❌ Failed to update order via API, using localStorage:', error);
      const orders = await PaymentDataManager.getOrders();
      const order = orders.find(o => o.id === id);
      if (order) {
        order.status = status;
        localStorage.setItem('payment_tracker_orders', JSON.stringify(orders));
      }
    }
  }

  // Product pricing management with variants
  static getSellingPrices() {
    const defaultPrices = {
      'sada': {
        50: 15,
        100: 25,
        250: 50,
        500: 100,
        1000: 200
      },
      'peri-peri': {
        50: 20,
        100: 30,
        250: 75,
        500: 150,
        1000: 275
      },
      'cheese': {
        50: 20,
        100: 30,
        250: 75,
        500: 150,
        1000: 275
      }
    };
    
    const stored = localStorage.getItem('payment_tracker_variant_prices');
    return stored ? JSON.parse(stored) : defaultPrices;
  }

  static saveSellingPrices(prices: { [variant: string]: { [size: number]: number } }) {
    localStorage.setItem('payment_tracker_variant_prices', JSON.stringify(prices));
  }

  static updateSellingPrice(variant: 'sada' | 'peri-peri' | 'cheese', size: number, newPrice: number) {
    const prices = PaymentDataManager.getSellingPrices();
    if (!prices[variant]) prices[variant] = {};
    prices[variant][size] = newPrice;
    PaymentDataManager.saveSellingPrices(prices);
  }

  // Income entries management - API + localStorage hybrid
  static async getIncomeEntries(): Promise<IncomeEntry[]> {
    try {
      const apiPayments = await paymentsApi.getAll();
      return apiPayments.map((payment: any) => ({
        id: payment._id,
        customerName: payment.customerName,
        amount: payment.amount,
        date: payment.date,
        orderSize: payment.orderSize,
        remarks: payment.remarks,
        orderId: payment.orderId,
        createdAt: payment.createdAt || payment.date
      }));
    } catch (error) {
      console.error('❌ Failed to fetch payments from API, using localStorage:', error);
      const stored = localStorage.getItem('payment_tracker_income');
      return stored ? JSON.parse(stored) : [];
    }
  }

  static async addIncomeEntry(entry: Omit<IncomeEntry, 'id' | 'createdAt'>): Promise<IncomeEntry> {
    try {
      const paymentData = {
        customerName: entry.customerName,
        amount: entry.amount,
        date: entry.date,
        orderSize: entry.orderSize,
        remarks: entry.remarks,
        orderId: entry.orderId
      };

      const createdPayment = await paymentsApi.create(paymentData);
      
      return {
        id: createdPayment._id,
        customerName: createdPayment.customerName,
        amount: createdPayment.amount,
        date: createdPayment.date,
        orderSize: createdPayment.orderSize,
        remarks: createdPayment.remarks,
        orderId: createdPayment.orderId,
        createdAt: createdPayment.createdAt || createdPayment.date
      };
    } catch (error) {
      console.error('❌ Failed to create payment via API, using localStorage:', error);
      // Fallback to localStorage
      const entries = await PaymentDataManager.getIncomeEntries();
      const newEntry: IncomeEntry = {
        ...entry,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        createdAt: new Date().toISOString()
      };
      
      entries.push(newEntry);
      localStorage.setItem('payment_tracker_income', JSON.stringify(entries));
      return newEntry;
    }
  }

  static async deleteIncomeEntry(id: string): Promise<void> {
    try {
      await paymentsApi.delete(id);
    } catch (error) {
      console.error('❌ Failed to delete payment via API, using localStorage:', error);
      const entries = await PaymentDataManager.getIncomeEntries();
      const filtered = entries.filter(entry => entry.id !== id);
      localStorage.setItem('payment_tracker_income', JSON.stringify(filtered));
    }
  }

  // Expense entries management - API + localStorage hybrid
  static async getExpenseEntries(): Promise<ExpenseEntry[]> {
    try {
      const apiExpenses = await expensesApi.getAll();
      return apiExpenses.map((expense: any) => ({
        id: expense._id,
        item: expense.item,
        amount: expense.amount,
        date: expense.date,
        remarks: expense.remarks,
        isExtra: expense.isExtra,
        createdAt: expense.createdAt || expense.date
      }));
    } catch (error) {
      console.error('❌ Failed to fetch expenses from API, using localStorage:', error);
      const stored = localStorage.getItem('payment_tracker_expenses');
      return stored ? JSON.parse(stored) : [];
    }
  }

  static async addExpenseEntry(entry: Omit<ExpenseEntry, 'id' | 'createdAt'>): Promise<ExpenseEntry> {
    try {
      const expenseData = {
        item: entry.item,
        amount: entry.amount,
        date: entry.date,
        remarks: entry.remarks,
        isExtra: entry.isExtra
      };

      const createdExpense = await expensesApi.create(expenseData);
      
      return {
        id: createdExpense._id,
        item: createdExpense.item,
        amount: createdExpense.amount,
        date: createdExpense.date,
        remarks: createdExpense.remarks,
        isExtra: createdExpense.isExtra,
        createdAt: createdExpense.createdAt || createdExpense.date
      };
    } catch (error) {
      console.error('❌ Failed to create expense via API, using localStorage:', error);
      // Fallback to localStorage
      const entries = await PaymentDataManager.getExpenseEntries();
      const newEntry: ExpenseEntry = {
        ...entry,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        createdAt: new Date().toISOString()
      };
      
      entries.push(newEntry);
      localStorage.setItem('payment_tracker_expenses', JSON.stringify(entries));
      return newEntry;
    }
  }

  static async deleteExpenseEntry(id: string): Promise<void> {
    try {
      await expensesApi.delete(id);
    } catch (error) {
      console.error('❌ Failed to delete expense via API, using localStorage:', error);
      const entries = await PaymentDataManager.getExpenseEntries();
      const filtered = entries.filter(entry => entry.id !== id);
      localStorage.setItem('payment_tracker_expenses', JSON.stringify(filtered));
    }
  }

  static async toggleExpenseExtra(id: string): Promise<void> {
    try {
      const entries = await PaymentDataManager.getExpenseEntries();
      const entry = entries.find(e => e.id === id);
      if (entry) {
        await expensesApi.update(id, { isExtra: !entry.isExtra });
      }
    } catch (error) {
      console.error('❌ Failed to update expense via API, using localStorage:', error);
      const entries = await PaymentDataManager.getExpenseEntries();
      const entry = entries.find(e => e.id === id);
      if (entry) {
        entry.isExtra = !entry.isExtra;
        localStorage.setItem('payment_tracker_expenses', JSON.stringify(entries));
      }
    }
  }

  // Utility functions
  static formatCurrency(amount: number): string {
    return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
  }

  static formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-IN');
  }
}

// ==========================================
// 📊 MAIN PAYMENT TRACKER COMPONENT
// ==========================================

export default function PaymentTracker() {
  const [activeTab, setActiveTab] = useState('orders');
  const [refreshKey, setRefreshKey] = useState(0);

  // Order form states
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    productVariant: 'sada' as 'sada' | 'peri-peri' | 'cheese',
    packages: {} as { [key: number]: number }
  });

  // *** FIXED: Income form states - properly initialized ***
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [incomeForm, setIncomeForm] = useState({
    customerName: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    orderSize: '',
    remarks: '',
    orderId: 'no-order' // *** FIX: Default value instead of empty string ***
  });

  // Expense form states
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    item: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    remarks: '',
    isExtra: false
  });

  // Data states
  const [orders, setOrders] = useState<Order[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
  
  // Pricing management states
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [currentPrices, setCurrentPrices] = useState<{ [variant: string]: { [size: number]: number } }>({});

  // Search and filter states
  const [searchFilters, setSearchFilters] = useState({
    orders: '',
    income: '',
    expenses: ''
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [priceTypeFilter, setPriceTypeFilter] = useState<'all' | 'retail' | 'wholesale'>('all');
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<'all' | 'business' | 'extra'>('all');

  // *** UPDATED: Load data with async API calls ***
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔄 Loading data from API...');
        const [ordersData, incomeData, expenseData] = await Promise.all([
          PaymentDataManager.getOrders(),
          PaymentDataManager.getIncomeEntries(),
          PaymentDataManager.getExpenseEntries()
        ]);
        
        setOrders(ordersData);
        setIncomeEntries(incomeData);
        setExpenseEntries(expenseData);
        setCurrentPrices(PaymentDataManager.getSellingPrices());
        
        console.log('✅ Data loaded successfully');
        console.log('📊 Orders:', ordersData.length);
        console.log('💰 Income entries:', incomeData.length);
        console.log('💸 Expense entries:', expenseData.length);
        console.log('💰 Current Prices:', PaymentDataManager.getSellingPrices());
      } catch (error) {
        console.error('❌ Error loading data:', error);
        // Set default values if error occurs
        setOrders([]);
        setIncomeEntries([]);
        setExpenseEntries([]);
        setCurrentPrices(PaymentDataManager.getSellingPrices());
      }
    };
    
    loadData();
  }, [refreshKey]);

  // Handle pricing updates
  const handlePriceUpdate = (variant: 'sada' | 'peri-peri' | 'cheese', size: number, newPrice: number) => {
    if (newPrice < 0) return;
    
    const updatedPrices = {
      ...currentPrices,
      [variant]: {
        ...currentPrices[variant],
        [size]: newPrice
      }
    };
    
    setCurrentPrices(updatedPrices);
    PaymentDataManager.saveSellingPrices(updatedPrices);
    console.log(`✅ Price updated: ${variant} ${size}g = ₹${newPrice}`);
  };

  // Filter functions
  const getFilteredOrders = () => {
    return orders.filter(order => {
      const matchesSearch = searchFilters.orders === '' || 
        order.customerName.toLowerCase().includes(searchFilters.orders.toLowerCase()) ||
        order.id.toLowerCase().includes(searchFilters.orders.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesPriceType = priceTypeFilter === 'all' || order.priceType === priceTypeFilter;
      
      return matchesSearch && matchesStatus && matchesPriceType;
    });
  };

  const getFilteredIncome = () => {
    return incomeEntries.filter(entry => {
      return searchFilters.income === '' || 
        entry.customerName.toLowerCase().includes(searchFilters.income.toLowerCase()) ||
        (entry.orderSize && entry.orderSize.toLowerCase().includes(searchFilters.income.toLowerCase())) ||
        (entry.remarks && entry.remarks.toLowerCase().includes(searchFilters.income.toLowerCase()));
    });
  };

  const getFilteredExpenses = () => {
    return expenseEntries.filter(entry => {
      const matchesSearch = searchFilters.expenses === '' || 
        entry.item.toLowerCase().includes(searchFilters.expenses.toLowerCase()) ||
        (entry.remarks && entry.remarks.toLowerCase().includes(searchFilters.expenses.toLowerCase()));
      
      const matchesType = expenseTypeFilter === 'all' || 
        (expenseTypeFilter === 'business' && !entry.isExtra) ||
        (expenseTypeFilter === 'extra' && entry.isExtra);
      
      return matchesSearch && matchesType;
    });
  };

  // Calculate totals
  const totalIncome = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalExpense = expenseEntries
    .filter(entry => !entry.isExtra)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const extraExpense = expenseEntries
    .filter(entry => entry.isExtra)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const profit = totalIncome - totalExpense;

  // *** UPDATED: Calculate order summary with variant pricing ***
  const calculateOrderSummary = (packages: { [key: number]: number }, productVariant: 'sada' | 'peri-peri' | 'cheese') => {
    let totalWeight = 0;
    let totalPackets = 0;
    let totalAmount = 0;
    
    try {
      const allPrices = currentPrices;
      let selectedPrices;
      
      if (allPrices && typeof allPrices === 'object') {
        selectedPrices = allPrices[productVariant] || {};
      } else {
        selectedPrices = {};
      }

      CONFIG.PACKET_SIZES.forEach(size => {
        const qty = packages[size] || 0;
        const weight = size * qty;
        
        let pricePerPacket = 0;
        if (selectedPrices && selectedPrices[size]) {
          pricePerPacket = selectedPrices[size];
        } else {
          // Fallback to default prices if not set
          const defaultPrices = {
            'sada': { 50: 15, 100: 25, 250: 50, 500: 100, 1000: 200 },
            'peri-peri': { 50: 20, 100: 30, 250: 75, 500: 150, 1000: 275 },
            'cheese': { 50: 20, 100: 30, 250: 75, 500: 150, 1000: 275 }
          };
          pricePerPacket = defaultPrices[productVariant]?.[size] || 0;
        }
        
        const amount = pricePerPacket * qty;

        totalWeight += weight;
        totalPackets += qty;
        totalAmount += amount;
      });
    } catch (error) {
      console.error('Error in calculateOrderSummary:', error);
      return { totalWeight: 0, totalPackets: 0, totalAmount: 0 };
    }

    return { totalWeight, totalPackets, totalAmount };
  };

  // Handle order form submission
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderForm.customerName.trim()) {
      alert('कृपया Customer Name भरें!');
      return;
    }

    const summary = calculateOrderSummary(orderForm.packages, orderForm.productVariant);
    
    if (summary.totalPackets === 0) {
      alert('कृपया कम से कम एक package का order दें!');
      return;
    }

    let selectedPrices;
    
    if (currentPrices && currentPrices[orderForm.productVariant]) {
      selectedPrices = currentPrices[orderForm.productVariant];
    } else {
      // Fallback to default prices
      const defaultPrices = {
        'sada': { 50: 15, 100: 25, 250: 50, 500: 100, 1000: 200 },
        'peri-peri': { 50: 20, 100: 30, 250: 75, 500: 150, 1000: 275 },
        'cheese': { 50: 20, 100: 30, 250: 75, 500: 150, 1000: 275 }
      };
      selectedPrices = defaultPrices[orderForm.productVariant] || {};
    }
    
    const packageItems: PackageItem[] = CONFIG.PACKET_SIZES
      .filter(size => orderForm.packages[size] > 0)
      .map(size => {
        const qty = orderForm.packages[size];
        let pricePerPacket = selectedPrices[size] || 0;
        
        return {
          size,
          quantity: qty,
          weight: size * qty,
          amount: pricePerPacket * qty
        };
      });

    try {
      await PaymentDataManager.addOrder({
        customerName: orderForm.customerName.trim(),
        deliveryDate: orderForm.deliveryDate,
        packages: packageItems,
        totalWeight: summary.totalWeight,
        totalAmount: summary.totalAmount,
        status: 'pending',
        productVariant: orderForm.productVariant
      });

      // Reset form
      setOrderForm({
        customerName: '',
        deliveryDate: new Date().toISOString().split('T')[0],
        productVariant: 'sada',
        packages: {}
      });
      
      setShowOrderForm(false);
      setRefreshKey(prev => prev + 1);
      alert('✅ Order created successfully!');
    } catch (error) {
      console.error('❌ Error creating order:', error);
      alert('❌ Order create करने में error आया!');
    }
  };

  // *** UPDATED: Handle income form submission with async API ***
  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!incomeForm.customerName.trim() || !incomeForm.amount) {
      alert('कृपया Customer Name और Amount भरें!');
      return;
    }

    const amountValue = parseFloat(incomeForm.amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      alert('कृपया valid Amount भरें!');
      return;
    }

    try {
      await PaymentDataManager.addIncomeEntry({
        customerName: incomeForm.customerName.trim(),
        amount: amountValue,
        date: incomeForm.date,
        orderSize: incomeForm.orderSize.trim() || undefined,
        remarks: incomeForm.remarks.trim() || undefined,
        orderId: incomeForm.orderId === 'no-order' ? undefined : incomeForm.orderId.trim()
      });

      // Reset form to default values
      setIncomeForm({
        customerName: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        orderSize: '',
        remarks: '',
        orderId: 'no-order'
      });
      
      setShowIncomeForm(false);
      setRefreshKey(prev => prev + 1);
      
      alert('✅ Income entry जोड़ा गया!');
    } catch (error) {
      console.error('❌ Error adding income:', error);
      alert('❌ Income add करने में error आया!');
    }
  };

  // Handle expense form submission
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!expenseForm.item.trim() || !expenseForm.amount) {
      alert('कृपया Item Name और Amount भरें!');
      return;
    }

    const amountValue = parseFloat(expenseForm.amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      alert('कृपया valid Amount भरें!');
      return;
    }

    try {
      await PaymentDataManager.addExpenseEntry({
        item: expenseForm.item.trim(),
        amount: amountValue,
        date: expenseForm.date,
        remarks: expenseForm.remarks.trim() || undefined,
        isExtra: expenseForm.isExtra
      });

      // Reset form
      setExpenseForm({
        item: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        remarks: '',
        isExtra: false
      });
      
      setShowExpenseForm(false);
      setRefreshKey(prev => prev + 1);
      
      alert('✅ Expense entry जोड़ा गया!');
    } catch (error) {
      console.error('❌ Error adding expense:', error);
      alert('❌ Expense add करने में error आया!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">💰 Payment Tracker + Order Management</h1>
            <p className="text-gray-600">Simple income and expense tracking for your business</p>
          </div>
          <Button 
            onClick={() => setShowPricingModal(true)}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            ⚙️ Edit Pricing
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="text-sm font-medium text-gray-600">Total Income</h3>
              <p className="text-2xl font-bold text-green-600">
                {PaymentDataManager.formatCurrency(totalIncome)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <TrendingDown className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <h3 className="text-sm font-medium text-gray-600">Total Expense</h3>
              <p className="text-2xl font-bold text-red-600">
                {PaymentDataManager.formatCurrency(totalExpense)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="text-sm font-medium text-gray-600">Net Profit</h3>
              <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {PaymentDataManager.formatCurrency(profit)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4 text-center">
              <TrendingDown className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <h3 className="text-sm font-medium text-gray-600">Extra Expenses</h3>
              <p className="text-2xl font-bold text-gray-600">
                {PaymentDataManager.formatCurrency(extraExpense)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders" className="text-blue-700">
              📋 Orders
            </TabsTrigger>
            <TabsTrigger value="intake" className="text-green-700">
              💰 Income (IN-TAKE)
            </TabsTrigger>
            <TabsTrigger value="outtake" className="text-red-700">
              💸 Expenses (OUT-TAKE)
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Orders Management</h2>
              <Button 
                onClick={() => setShowOrderForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Order
              </Button>
            </div>

            {/* Search and Filter Controls for Orders */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="orderSearch" className="text-sm font-medium text-gray-700">Search Orders</Label>
                    <Input
                      id="orderSearch"
                      placeholder="Search by customer name, order ID..."
                      value={searchFilters.orders}
                      onChange={(e) => setSearchFilters(prev => ({...prev, orders: e.target.value}))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Status Filter</Label>
                    <Select value={statusFilter} onValueChange={(value: 'all' | 'pending' | 'completed') => setStatusFilter(value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending Only</SelectItem>
                        <SelectItem value="completed">Completed Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Price Type</Label>
                    <Select value={priceTypeFilter} onValueChange={(value: 'all' | 'retail' | 'wholesale') => setPriceTypeFilter(value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="retail">🏪 Retail Only</SelectItem>
                        <SelectItem value="wholesale">🏭 Wholesale Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSearchFilters(prev => ({...prev, orders: ''}));
                        setStatusFilter('all');
                        setPriceTypeFilter('all');
                      }}
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Showing {getFilteredOrders().length} of {orders.length} orders
                </div>
              </CardContent>
            </Card>

            {/* Order Form Modal */}
            {showOrderForm && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-blue-800">Create New Order</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowOrderForm(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleOrderSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="orderCustomerName">Customer Name *</Label>
                        <Input
                          id="orderCustomerName"
                          value={orderForm.customerName}
                          onChange={(e) => setOrderForm(prev => ({...prev, customerName: e.target.value}))}
                          placeholder="Enter customer name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="orderDeliveryDate">Delivery Date *</Label>
                        <Input
                          id="orderDeliveryDate"
                          type="date"
                          value={orderForm.deliveryDate}
                          onChange={(e) => setOrderForm(prev => ({...prev, deliveryDate: e.target.value}))}
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Product Variant *</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          type="button"
                          variant={orderForm.productVariant === 'sada' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setOrderForm(prev => ({...prev, productVariant: 'sada'}))}
                          className={orderForm.productVariant === 'sada' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                        >
                          🥨 Sada
                        </Button>
                        <Button
                          type="button"
                          variant={orderForm.productVariant === 'peri-peri' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setOrderForm(prev => ({...prev, productVariant: 'peri-peri'}))}
                          className={orderForm.productVariant === 'peri-peri' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                          🌶️ Peri Peri
                        </Button>
                        <Button
                          type="button"
                          variant={orderForm.productVariant === 'cheese' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setOrderForm(prev => ({...prev, productVariant: 'cheese'}))}
                          className={orderForm.productVariant === 'cheese' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                        >
                          🧀 Cheese
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-base font-semibold">
                        Select Packages ({CONFIG.PRODUCT_VARIANTS[orderForm.productVariant]} Rates)
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-3">
                        {CONFIG.PACKET_SIZES.map(size => {
                          let currentRate = 0;
                          
                          if (currentPrices && currentPrices[orderForm.productVariant]) {
                            currentRate = currentPrices[orderForm.productVariant][size] || 0;
                          }
                          
                          if (currentRate === 0) {
                            // Default fallback rates based on variant
                            const defaultRates = {
                              'sada': { 50: 15, 100: 25, 250: 50, 500: 100, 1000: 200 },
                              'peri-peri': { 50: 20, 100: 30, 250: 75, 500: 150, 1000: 275 },
                              'cheese': { 50: 20, 100: 30, 250: 75, 500: 150, 1000: 275 }
                            };
                            currentRate = defaultRates[orderForm.productVariant][size] || 0;
                          }
                          
                          return (
                            <Card key={size} className="p-3 border-gray-200 bg-gray-50">
                              <div className="text-center">
                                <h4 className="font-semibold text-gray-800 mb-2">{size}g Packets</h4>
                                <Input
                                  type="number"
                                  min="0"
                                  value={orderForm.packages[size] || ''}
                                  onChange={(e) => setOrderForm(prev => ({
                                    ...prev,
                                    packages: {
                                      ...prev.packages,
                                      [size]: parseInt(e.target.value) || 0
                                    }
                                  }))}
                                  placeholder="Qty"
                                  className="text-center mb-2 h-8"
                                />
                                <div className="text-xs text-gray-700 font-medium">
                                  Rate: ₹{currentRate}/packet
                                </div>
                                {orderForm.packages[size] > 0 && (
                                  <div className="text-xs text-primary font-bold mt-1">
                                    Total: {PaymentDataManager.formatCurrency(currentRate * orderForm.packages[size])}
                                  </div>
                                )}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>

                    {/* Order Summary */}
                    {(() => {
                      const summary = calculateOrderSummary(orderForm.packages, orderForm.priceType);
                      return (
                        <Card className="bg-gray-50">
                          <CardContent className="p-4">
                            <h4 className="font-semibold text-gray-800 mb-3">Order Summary</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div className="flex justify-between">
                                <span>Total Weight:</span>
                                <span className="font-medium">{summary.totalWeight}g</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Packets:</span>
                                <span className="font-medium">{summary.totalPackets}</span>
                              </div>
                              <div className="flex justify-between text-lg font-semibold text-primary">
                                <span>Total Amount:</span>
                                <span>{PaymentDataManager.formatCurrency(summary.totalAmount)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}

                    <div className="flex gap-2">
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        Create Order
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowOrderForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Orders Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredOrders().slice().reverse().map(order => (
                      <TableRow key={order.id}>
                        <TableCell>{PaymentDataManager.formatDate(order.createdAt)}</TableCell>
                        <TableCell className="font-medium">{order.customerName}</TableCell>
                        <TableCell>{PaymentDataManager.formatDate(order.deliveryDate)}</TableCell>
                        <TableCell>
                          <Badge variant={order.priceType === 'wholesale' ? 'default' : 'secondary'}>
                            {order.priceType === 'wholesale' ? '🏭 Wholesale' : '🏪 Retail'}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.totalWeight}g</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {PaymentDataManager.formatCurrency(order.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={order.status === 'completed' ? 'default' : 'destructive'}
                            className="cursor-pointer"
                            onClick={() => {
                              PaymentDataManager.updateOrderStatus(
                                order.id, 
                                order.status === 'pending' ? 'completed' : 'pending'
                              );
                              setRefreshKey(prev => prev + 1);
                            }}
                          >
                            {order.status === 'completed' ? 'Completed' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (confirm('क्या आप इस order को delete करना चाहते हैं?')) {
                                try {
                                  await PaymentDataManager.deleteOrder(order.id);
                                  setRefreshKey(prev => prev + 1);
                                  alert('✅ Order deleted successfully!');
                                } catch (error) {
                                  console.error('❌ Error deleting order:', error);
                                  alert('❌ Order delete करने में error आया!');
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {getFilteredOrders().length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          {orders.length === 0 ? "No orders yet. Create your first order!" : "No orders match your search criteria."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* *** FIXED: Income Tab with proper Select handling *** */}
          <TabsContent value="intake" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Income Entries</h2>
              <Button 
                onClick={() => setShowIncomeForm(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Income
              </Button>
            </div>

            {/* Search Controls for Income */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="incomeSearch" className="text-sm font-medium text-gray-700">Search Income Entries</Label>
                    <Input
                      id="incomeSearch"
                      placeholder="Search by customer name, order size, remarks..."
                      value={searchFilters.income}
                      onChange={(e) => setSearchFilters(prev => ({...prev, income: e.target.value}))}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSearchFilters(prev => ({...prev, income: ''}))}
                      className="w-full"
                    >
                      Clear Search
                    </Button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Showing {getFilteredIncome().length} of {incomeEntries.length} income entries
                </div>
              </CardContent>
            </Card>

            {/* *** FIXED: Income Form Modal with proper Select handling *** */}
            {showIncomeForm && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-green-800">Add Income Entry</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setShowIncomeForm(false);
                        // Reset form when closing
                        setIncomeForm({
                          customerName: '',
                          amount: '',
                          date: new Date().toISOString().split('T')[0],
                          orderSize: '',
                          remarks: '',
                          orderId: 'no-order'
                        });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleIncomeSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="customerName">Customer Name *</Label>
                        <Input
                          id="customerName"
                          value={incomeForm.customerName}
                          onChange={(e) => setIncomeForm(prev => ({...prev, customerName: e.target.value}))}
                          placeholder="Enter customer name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="amount">Amount *</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={incomeForm.amount}
                          onChange={(e) => setIncomeForm(prev => ({...prev, amount: e.target.value}))}
                          placeholder="Enter amount received"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="date">Date *</Label>
                        <Input
                          id="date"
                          type="date"
                          value={incomeForm.date}
                          onChange={(e) => setIncomeForm(prev => ({...prev, date: e.target.value}))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="orderSize">Order Size (Optional)</Label>
                        <Input
                          id="orderSize"
                          value={incomeForm.orderSize}
                          onChange={(e) => setIncomeForm(prev => ({...prev, orderSize: e.target.value}))}
                          placeholder="e.g. 2kg namak para"
                        />
                      </div>
                      <div>
                        <Label htmlFor="linkedOrder">Link to Order (Optional)</Label>
                        {/* *** FIXED: Select component with proper value handling *** */}
                        <Select 
                          value={incomeForm.orderId} 
                          onValueChange={(value) => setIncomeForm(prev => ({...prev, orderId: value}))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select order..." />
                          </SelectTrigger>
                          <SelectContent>
                            {/* *** FIX: Proper SelectItem with non-empty value *** */}
                            <SelectItem value="no-order">No Order Link</SelectItem>
                            {orders.map(order => (
                              <SelectItem key={order.id} value={order.id}>
                                {order.customerName} - {PaymentDataManager.formatCurrency(order.totalAmount)} ({PaymentDataManager.formatDate(order.createdAt)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="remarks">Remarks (Optional)</Label>
                      <Textarea
                        id="remarks"
                        value={incomeForm.remarks}
                        onChange={(e) => setIncomeForm(prev => ({...prev, remarks: e.target.value}))}
                        placeholder="Any additional notes"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="bg-green-600 hover:bg-green-700">
                        Add Income
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowIncomeForm(false);
                          // Reset form when canceling
                          setIncomeForm({
                            customerName: '',
                            amount: '',
                            date: new Date().toISOString().split('T')[0],
                            orderSize: '',
                            remarks: '',
                            orderId: 'no-order'
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Income Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Order Size</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredIncome().slice().reverse().map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell>{PaymentDataManager.formatDate(entry.date)}</TableCell>
                        <TableCell className="font-medium">{entry.customerName}</TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          {PaymentDataManager.formatCurrency(entry.amount)}
                        </TableCell>
                        <TableCell>{entry.orderSize || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">{entry.remarks || '-'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('क्या आप इस income entry को delete करना चाहते हैं?')) {
                                PaymentDataManager.deleteIncomeEntry(entry.id);
                                setRefreshKey(prev => prev + 1);
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {getFilteredIncome().length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          {incomeEntries.length === 0 ? "No income entries yet. Add your first income entry!" : "No income entries match your search criteria."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="outtake" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Expense Entries</h2>
              <Button 
                onClick={() => setShowExpenseForm(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </div>

            {/* Search and Filter Controls for Expenses */}
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="expenseSearch" className="text-sm font-medium text-gray-700">Search Expenses</Label>
                    <Input
                      id="expenseSearch"
                      placeholder="Search by item name, remarks..."
                      value={searchFilters.expenses}
                      onChange={(e) => setSearchFilters(prev => ({...prev, expenses: e.target.value}))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Expense Type</Label>
                    <Select value={expenseTypeFilter} onValueChange={(value: 'all' | 'business' | 'extra') => setExpenseTypeFilter(value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Expenses</SelectItem>
                        <SelectItem value="business">Business Only</SelectItem>
                        <SelectItem value="extra">Extra Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSearchFilters(prev => ({...prev, expenses: ''}));
                        setExpenseTypeFilter('all');
                      }}
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Showing {getFilteredExpenses().length} of {expenseEntries.length} expense entries
                </div>
              </CardContent>
            </Card>

            {/* Expense Form Modal */}
            {showExpenseForm && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-red-800">Add Expense Entry</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowExpenseForm(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleExpenseSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="item">Item/Material *</Label>
                        <Input
                          id="item"
                          value={expenseForm.item}
                          onChange={(e) => setExpenseForm(prev => ({...prev, item: e.target.value}))}
                          placeholder="e.g. Maida, Oil, Gas cylinder"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="expenseAmount">Amount *</Label>
                        <Input
                          id="expenseAmount"
                          type="number"
                          value={expenseForm.amount}
                          onChange={(e) => setExpenseForm(prev => ({...prev, amount: e.target.value}))}
                          placeholder="Enter amount spent"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="expenseDate">Date *</Label>
                        <Input
                          id="expenseDate"
                          type="date"
                          value={expenseForm.date}
                          onChange={(e) => setExpenseForm(prev => ({...prev, date: e.target.value}))}
                          required
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isExtra"
                          checked={expenseForm.isExtra}
                          onChange={(e) => setExpenseForm(prev => ({...prev, isExtra: e.target.checked}))}
                          className="rounded"
                        />
                        <Label htmlFor="isExtra" className="text-sm">
                          Mark as Extra (won't count in profit)
                        </Label>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="expenseRemarks">Remarks (Optional)</Label>
                      <Textarea
                        id="expenseRemarks"
                        value={expenseForm.remarks}
                        onChange={(e) => setExpenseForm(prev => ({...prev, remarks: e.target.value}))}
                        placeholder="Any additional notes"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="bg-red-600 hover:bg-red-700">
                        Add Expense
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowExpenseForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Expenses Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredExpenses().slice().reverse().map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell>{PaymentDataManager.formatDate(entry.date)}</TableCell>
                        <TableCell className="font-medium">{entry.item}</TableCell>
                        <TableCell className="text-red-600 font-semibold">
                          {PaymentDataManager.formatCurrency(entry.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={entry.isExtra ? "secondary" : "destructive"}
                            className="cursor-pointer"
                            onClick={() => {
                              PaymentDataManager.toggleExpenseExtra(entry.id);
                              setRefreshKey(prev => prev + 1);
                            }}
                          >
                            {entry.isExtra ? 'Extra' : 'Business'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{entry.remarks || '-'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('क्या आप इस expense entry को delete करना चाहते हैं?')) {
                                PaymentDataManager.deleteExpenseEntry(entry.id);
                                setRefreshKey(prev => prev + 1);
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {getFilteredExpenses().length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          {expenseEntries.length === 0 ? "No expense entries yet. Add your first expense entry!" : "No expense entries match your search criteria."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Pricing Management Modal */}
        {showPricingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-bold text-gray-800">
                    ⚙️ Edit Product Pricing - All Variants
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowPricingModal(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-gray-600">Set prices for different variants and packet sizes. Changes are saved automatically.</p>
              </CardHeader>
              <CardContent className="space-y-8">
                
                {/* Sada Namak Para Pricing */}
                <div>
                  <h3 className="text-lg font-semibold text-orange-700 mb-4">🥨 Sada Namak Para Pricing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {CONFIG.PACKET_SIZES.map(size => (
                      <Card key={`sada-${size}`} className="border-orange-200 bg-orange-50">
                        <CardContent className="p-4 text-center">
                          <h4 className="font-semibold text-gray-800 mb-3">{size}g Packet</h4>
                          <div className="space-y-2">
                            <Label htmlFor={`sada-${size}`} className="text-xs text-gray-600">
                              Price per packet (₹)
                            </Label>
                            <Input
                              id={`sada-${size}`}
                              type="number"
                              min="0"
                              step="0.5"
                              value={currentPrices.sada?.[size] || ''}
                              onChange={(e) => handlePriceUpdate('sada', size, parseFloat(e.target.value) || 0)}
                              className="text-center font-semibold"
                              placeholder="0"
                            />
                            <div className="text-xs text-orange-700">
                              Rate per gram: ₹{((currentPrices.sada?.[size] || 0) / size).toFixed(2)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Peri Peri Namak Para Pricing */}
                <div>
                  <h3 className="text-lg font-semibold text-red-700 mb-4">🌶️ Peri Peri Namak Para Pricing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {CONFIG.PACKET_SIZES.map(size => (
                      <Card key={`peri-peri-${size}`} className="border-red-200 bg-red-50">
                        <CardContent className="p-4 text-center">
                          <h4 className="font-semibold text-gray-800 mb-3">{size}g Packet</h4>
                          <div className="space-y-2">
                            <Label htmlFor={`peri-peri-${size}`} className="text-xs text-gray-600">
                              Price per packet (₹)
                            </Label>
                            <Input
                              id={`peri-peri-${size}`}
                              type="number"
                              min="0"
                              step="0.5"
                              value={currentPrices['peri-peri']?.[size] || ''}
                              onChange={(e) => handlePriceUpdate('peri-peri', size, parseFloat(e.target.value) || 0)}
                              className="text-center font-semibold"
                              placeholder="0"
                            />
                            <div className="text-xs text-red-700">
                              Rate per gram: ₹{((currentPrices['peri-peri']?.[size] || 0) / size).toFixed(2)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Cheese Namak Para Pricing */}
                <div>
                  <h3 className="text-lg font-semibold text-yellow-700 mb-4">🧀 Cheese Namak Para Pricing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {CONFIG.PACKET_SIZES.map(size => (
                      <Card key={`cheese-${size}`} className="border-yellow-200 bg-yellow-50">
                        <CardContent className="p-4 text-center">
                          <h4 className="font-semibold text-gray-800 mb-3">{size}g Packet</h4>
                          <div className="space-y-2">
                            <Label htmlFor={`cheese-${size}`} className="text-xs text-gray-600">
                              Price per packet (₹)
                            </Label>
                            <Input
                              id={`cheese-${size}`}
                              type="number"
                              min="0"
                              step="0.5"
                              value={currentPrices.cheese?.[size] || ''}
                              onChange={(e) => handlePriceUpdate('cheese', size, parseFloat(e.target.value) || 0)}
                              className="text-center font-semibold"
                              placeholder="0"
                            />
                            <div className="text-xs text-yellow-700">
                              Rate per gram: ₹{((currentPrices.cheese?.[size] || 0) / size).toFixed(2)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="border-t pt-6">
                  <h4 className="font-semibold text-gray-800 mb-4">Quick Pricing Actions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const updatedPrices = { ...currentPrices };
                        // Set default prices based on image
                        updatedPrices.sada = { 50: 15, 100: 25, 250: 50, 500: 100, 1000: 200 };
                        setCurrentPrices(updatedPrices);
                        PaymentDataManager.saveSellingPrices(updatedPrices);
                      }}
                      className="border-orange-300 text-orange-700"
                    >
                      Reset Sada Prices (Menu Default)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const updatedPrices = { ...currentPrices };
                        updatedPrices['peri-peri'] = { 50: 20, 100: 30, 250: 75, 500: 150, 1000: 275 };
                        setCurrentPrices(updatedPrices);
                        PaymentDataManager.saveSellingPrices(updatedPrices);
                      }}
                      className="border-red-300 text-red-700"
                    >
                      Reset Peri Peri Prices (Menu Default)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const updatedPrices = { ...currentPrices };
                        updatedPrices.cheese = { 50: 20, 100: 30, 250: 75, 500: 150, 1000: 275 };
                        setCurrentPrices(updatedPrices);
                        PaymentDataManager.saveSellingPrices(updatedPrices);
                      }}
                      className="border-yellow-300 text-yellow-700"
                    >
                      Reset Cheese Prices (Menu Default)
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowPricingModal(false)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPricingModal(false);
                      setRefreshKey(prev => prev + 1);
                      alert('✅ All pricing changes have been saved!');
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Save & Apply All Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
