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
  priceType: 'retail' | 'wholesale';
  createdAt: string;
}

interface PackageItem {
  size: number; // packet size in grams (50g, 100g, etc.)
  quantity: number; // number of packets
  weight: number; // total weight for this package type
  amount: number; // total amount for this package type
}

interface IncomeEntry {
  id: string;
  customerName: string;
  amount: number;
  date: string;
  orderSize?: string;
  remarks?: string;
  orderId?: string; // Link to order if payment is for specific order
  createdAt: string;
}

interface ExpenseEntry {
  id: string;
  item: string;
  amount: number;
  date: string;
  remarks?: string;
  isExtra: boolean; // Extra expenses won't count in profit calculation
  createdAt: string;
}

// Configuration constants
const CONFIG = {
  PACKET_SIZES: [50, 100, 250, 500, 1000], // Available packet sizes in grams
  YIELD_RATIO: 1.4, // 1kg material produces 1.4kg finished product
  GAS_COST_PER_MINUTE: 0.5 // Gas cost per minute of cooking
};

// ==========================================
// 🗄️ DATA MANAGER CLASS (localStorage based)
// ==========================================

class PaymentDataManager {
  // Orders management
  static getOrders(): Order[] {
    const stored = localStorage.getItem('payment_tracker_orders');
    return stored ? JSON.parse(stored) : [];
  }

  static saveOrders(orders: Order[]) {
    localStorage.setItem('payment_tracker_orders', JSON.stringify(orders));
  }

  static addOrder(order: Omit<Order, 'id' | 'createdAt'>): Order {
    const orders = PaymentDataManager.getOrders();
    const newOrder: Order = {
      ...order,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString()
    };
    
    orders.push(newOrder);
    PaymentDataManager.saveOrders(orders);
    return newOrder;
  }

  static deleteOrder(id: string) {
    const orders = PaymentDataManager.getOrders();
    const filtered = orders.filter(order => order.id !== id);
    PaymentDataManager.saveOrders(filtered);
  }

  static updateOrderStatus(id: string, status: 'pending' | 'completed') {
    const orders = PaymentDataManager.getOrders();
    const order = orders.find(o => o.id === id);
    if (order) {
      order.status = status;
      PaymentDataManager.saveOrders(orders);
    }
  }

  // Product pricing management - selling prices को localStorage में store करते हैं (wholesale + retail)
  static getSellingPrices() {
    const defaultPrices = {
      retail: {
        50: 15,   // 50g = ₹15
        100: 25,  // 100g = ₹25
        250: 70,  // 250g = ₹70
        500: 100, // 500g = ₹100
        1000: 250 // 1kg = ₹250
      },
      wholesale: {
        50: 12,   // 50g = ₹12 (20% less)
        100: 20,  // 100g = ₹20 (20% less)
        250: 56,  // 250g = ₹56 (20% less)
        500: 80,  // 500g = ₹80 (20% less)
        1000: 200 // 1kg = ₹200 (20% less)
      }
    };
    
    const stored = localStorage.getItem('payment_tracker_selling_prices');
    return stored ? JSON.parse(stored) : defaultPrices;
  }

  static saveSellingPrices(prices: { retail: { [key: number]: number }, wholesale: { [key: number]: number } }) {
    localStorage.setItem('payment_tracker_selling_prices', JSON.stringify(prices));
  }

  static updateSellingPrice(type: 'retail' | 'wholesale', size: number, newPrice: number) {
    const prices = PaymentDataManager.getSellingPrices();
    if (!prices[type]) prices[type] = {};
    prices[type][size] = newPrice;
    PaymentDataManager.saveSellingPrices(prices);
  }

  // Income entries management
  static getIncomeEntries(): IncomeEntry[] {
    const stored = localStorage.getItem('payment_tracker_income');
    return stored ? JSON.parse(stored) : [];
  }

  static saveIncomeEntries(entries: IncomeEntry[]) {
    localStorage.setItem('payment_tracker_income', JSON.stringify(entries));
  }

  static addIncomeEntry(entry: Omit<IncomeEntry, 'id' | 'createdAt'>): IncomeEntry {
    const entries = PaymentDataManager.getIncomeEntries();
    const newEntry: IncomeEntry = {
      ...entry,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString()
    };
    
    entries.push(newEntry);
    PaymentDataManager.saveIncomeEntries(entries);
    return newEntry;
  }

  static deleteIncomeEntry(id: string) {
    const entries = PaymentDataManager.getIncomeEntries();
    const filtered = entries.filter(entry => entry.id !== id);
    PaymentDataManager.saveIncomeEntries(filtered);
  }

  // Expense entries management
  static getExpenseEntries(): ExpenseEntry[] {
    const stored = localStorage.getItem('payment_tracker_expenses');
    return stored ? JSON.parse(stored) : [];
  }

  static saveExpenseEntries(entries: ExpenseEntry[]) {
    localStorage.setItem('payment_tracker_expenses', JSON.stringify(entries));
  }

  static addExpenseEntry(entry: Omit<ExpenseEntry, 'id' | 'createdAt'>): ExpenseEntry {
    const entries = PaymentDataManager.getExpenseEntries();
    const newEntry: ExpenseEntry = {
      ...entry,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString()
    };
    
    entries.push(newEntry);
    PaymentDataManager.saveExpenseEntries(entries);
    return newEntry;
  }

  static deleteExpenseEntry(id: string) {
    const entries = PaymentDataManager.getExpenseEntries();
    const filtered = entries.filter(entry => entry.id !== id);
    PaymentDataManager.saveExpenseEntries(filtered);
  }

  static toggleExpenseExtra(id: string) {
    const entries = PaymentDataManager.getExpenseEntries();
    const entry = entries.find(e => e.id === id);
    if (entry) {
      entry.isExtra = !entry.isExtra;
      PaymentDataManager.saveExpenseEntries(entries);
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
    priceType: 'retail' as 'retail' | 'wholesale',
    packages: {} as { [key: number]: number }
  });

  // Income form states
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [incomeForm, setIncomeForm] = useState({
    customerName: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    orderSize: '',
    remarks: '',
    orderId: ''
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
  const [currentPrices, setCurrentPrices] = useState<{ retail: { [key: number]: number }, wholesale: { [key: number]: number } }>({
    retail: {},
    wholesale: {}
  });

  // Search and filter states
  const [searchFilters, setSearchFilters] = useState({
    orders: '',
    income: '',
    expenses: ''
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [priceTypeFilter, setPriceTypeFilter] = useState<'all' | 'retail' | 'wholesale'>('all');
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<'all' | 'business' | 'extra'>('all');

  // Load data on mount and refresh
  useEffect(() => {
    setOrders(PaymentDataManager.getOrders());
    setIncomeEntries(PaymentDataManager.getIncomeEntries());
    setExpenseEntries(PaymentDataManager.getExpenseEntries());
    setCurrentPrices(PaymentDataManager.getSellingPrices());
  }, [refreshKey]);

  // Handle pricing updates
  const handlePriceUpdate = (type: 'retail' | 'wholesale', size: number, newPrice: number) => {
    if (newPrice < 0) return;
    
    const updatedPrices = {
      ...currentPrices,
      [type]: {
        ...currentPrices[type],
        [size]: newPrice
      }
    };
    
    setCurrentPrices(updatedPrices);
    PaymentDataManager.saveSellingPrices(updatedPrices);
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

  // Calculate order summary for safe pricing access
  const calculateOrderSummary = (packages: { [key: number]: number }, priceType: 'retail' | 'wholesale') => {
    let totalWeight = 0;
    let totalPackets = 0;
    let totalAmount = 0;
    
    try {
      const allPrices = PaymentDataManager.getSellingPrices();
      let selectedPrices;
      
      if (allPrices && typeof allPrices === 'object') {
        selectedPrices = allPrices[priceType] || allPrices.retail || {};
      } else {
        // Fallback default prices
        selectedPrices = {
          50: priceType === 'wholesale' ? 12 : 15,
          100: priceType === 'wholesale' ? 20 : 25,
          250: priceType === 'wholesale' ? 56 : 70,
          500: priceType === 'wholesale' ? 80 : 100,
          1000: priceType === 'wholesale' ? 200 : 250
        };
      }

      CONFIG.PACKET_SIZES.forEach(size => {
        const qty = packages[size] || 0;
        const weight = size * qty;
        
        let pricePerPacket = 0;
        if (selectedPrices && selectedPrices[size]) {
          pricePerPacket = selectedPrices[size];
        } else {
          pricePerPacket = priceType === 'wholesale' ? (size * 0.2) : (size * 0.25);
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
  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderForm.customerName.trim()) {
      alert('कृपया Customer Name भरें!');
      return;
    }

    const summary = calculateOrderSummary(orderForm.packages, orderForm.priceType);
    
    if (summary.totalPackets === 0) {
      alert('कृपया कम से कम एक package का order दें!');
      return;
    }

    // Create package items array
    const allPrices = PaymentDataManager.getSellingPrices();
    let selectedPrices;
    
    if (allPrices && typeof allPrices === 'object') {
      selectedPrices = allPrices[orderForm.priceType] || allPrices.retail || {};
    } else {
      selectedPrices = {
        50: orderForm.priceType === 'wholesale' ? 12 : 15,
        100: orderForm.priceType === 'wholesale' ? 20 : 25,
        250: orderForm.priceType === 'wholesale' ? 56 : 70,
        500: orderForm.priceType === 'wholesale' ? 80 : 100,
        1000: orderForm.priceType === 'wholesale' ? 200 : 250
      };
    }
    
    const packageItems: PackageItem[] = CONFIG.PACKET_SIZES
      .filter(size => orderForm.packages[size] > 0)
      .map(size => {
        const qty = orderForm.packages[size];
        let pricePerPacket = 0;
        if (selectedPrices && selectedPrices[size]) {
          pricePerPacket = selectedPrices[size];
        } else {
          pricePerPacket = orderForm.priceType === 'wholesale' ? (size * 0.2) : (size * 0.25);
        }
        
        return {
          size,
          quantity: qty,
          weight: size * qty,
          amount: pricePerPacket * qty
        };
      });

    PaymentDataManager.addOrder({
      customerName: orderForm.customerName.trim(),
      deliveryDate: orderForm.deliveryDate,
      packages: packageItems,
      totalWeight: summary.totalWeight,
      totalAmount: summary.totalAmount,
      status: 'pending',
      priceType: orderForm.priceType
    });

    // Reset form
    setOrderForm({
      customerName: '',
      deliveryDate: new Date().toISOString().split('T')[0],
      priceType: 'retail',
      packages: {}
    });
    
    setShowOrderForm(false);
    setRefreshKey(prev => prev + 1);
  };

  // Handle income form submission
  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!incomeForm.customerName.trim() || !incomeForm.amount) {
      alert('कृपया Customer Name और Amount भरें!');
      return;
    }

    PaymentDataManager.addIncomeEntry({
      customerName: incomeForm.customerName.trim(),
      amount: parseFloat(incomeForm.amount),
      date: incomeForm.date,
      orderSize: incomeForm.orderSize.trim() || undefined,
      remarks: incomeForm.remarks.trim() || undefined,
      orderId: incomeForm.orderId.trim() || undefined
    });

    // Reset form
    setIncomeForm({
      customerName: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      orderSize: '',
      remarks: '',
      orderId: ''
    });
    
    setShowIncomeForm(false);
    setRefreshKey(prev => prev + 1);
  };

  // Handle expense form submission
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!expenseForm.item.trim() || !expenseForm.amount) {
      alert('कृपया Item Name और Amount भरें!');
      return;
    }

    PaymentDataManager.addExpenseEntry({
      item: expenseForm.item.trim(),
      amount: parseFloat(expenseForm.amount),
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
                      <Label className="text-sm font-medium">Pricing Type *</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          type="button"
                          variant={orderForm.priceType === 'retail' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setOrderForm(prev => ({...prev, priceType: 'retail'}))}
                          className={orderForm.priceType === 'retail' ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                          🏪 Retail
                        </Button>
                        <Button
                          type="button"
                          variant={orderForm.priceType === 'wholesale' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setOrderForm(prev => ({...prev, priceType: 'wholesale'}))}
                          className={orderForm.priceType === 'wholesale' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                        >
                          🏭 Wholesale
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-base font-semibold">
                        Select Packages ({orderForm.priceType === 'wholesale' ? '🏭 Wholesale' : '🏪 Retail'} Rates)
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-3">
                        {CONFIG.PACKET_SIZES.map(size => {
                          const allPrices = PaymentDataManager.getSellingPrices();
                          let currentRate = 0;
                          
                          if (allPrices && typeof allPrices === 'object') {
                            const selectedPrices = allPrices[orderForm.priceType] || allPrices.retail || {};
                            currentRate = selectedPrices[size] || 0;
                          }
                          
                          if (currentRate === 0) {
                            currentRate = orderForm.priceType === 'wholesale' ? (size * 0.2) : (size * 0.25);
                          }
                          
                          return (
                            <Card key={size} className={`p-3 ${orderForm.priceType === 'wholesale' ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}>
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
                                <div className={`text-xs ${orderForm.priceType === 'wholesale' ? 'text-blue-700' : 'text-green-700'} font-medium`}>
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
                            onClick={() => {
                              PaymentDataManager.deleteOrder(order.id);
                              setRefreshKey(prev => prev + 1);
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

          {/* Income Tab */}
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

            {/* Income Form Modal */}
            {showIncomeForm && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-green-800">Add Income Entry</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowIncomeForm(false)}
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
                        <Select value={incomeForm.orderId} onValueChange={(value) => setIncomeForm(prev => ({...prev, orderId: value}))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select order..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No Order Link</SelectItem>
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
                        onClick={() => setShowIncomeForm(false)}
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
                              PaymentDataManager.deleteIncomeEntry(entry.id);
                              setRefreshKey(prev => prev + 1);
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
                              PaymentDataManager.deleteExpenseEntry(entry.id);
                              setRefreshKey(prev => prev + 1);
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
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-bold text-gray-800">
                    ⚙️ Edit Product Pricing
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowPricingModal(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-gray-600">Set prices for different packet sizes. Changes will apply to new orders.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Retail Pricing Section */}
                <div>
                  <h3 className="text-lg font-semibold text-green-700 mb-4">🏪 Retail Pricing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {CONFIG.PACKET_SIZES.map(size => (
                      <Card key={`retail-${size}`} className="border-green-200 bg-green-50">
                        <CardContent className="p-4 text-center">
                          <h4 className="font-semibold text-gray-800 mb-3">{size}g Packet</h4>
                          <div className="space-y-2">
                            <Label htmlFor={`retail-${size}`} className="text-xs text-gray-600">
                              Price per packet (₹)
                            </Label>
                            <Input
                              id={`retail-${size}`}
                              type="number"
                              min="0"
                              step="0.5"
                              value={currentPrices.retail?.[size] || ''}
                              onChange={(e) => handlePriceUpdate('retail', size, parseFloat(e.target.value) || 0)}
                              className="text-center font-semibold"
                              placeholder="0"
                            />
                            <div className="text-xs text-green-700">
                              Rate per gram: ₹{((currentPrices.retail?.[size] || 0) / size).toFixed(2)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Wholesale Pricing Section */}
                <div>
                  <h3 className="text-lg font-semibold text-blue-700 mb-4">🏭 Wholesale Pricing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {CONFIG.PACKET_SIZES.map(size => (
                      <Card key={`wholesale-${size}`} className="border-blue-200 bg-blue-50">
                        <CardContent className="p-4 text-center">
                          <h4 className="font-semibold text-gray-800 mb-3">{size}g Packet</h4>
                          <div className="space-y-2">
                            <Label htmlFor={`wholesale-${size}`} className="text-xs text-gray-600">
                              Price per packet (₹)
                            </Label>
                            <Input
                              id={`wholesale-${size}`}
                              type="number"
                              min="0"
                              step="0.5"
                              value={currentPrices.wholesale?.[size] || ''}
                              onChange={(e) => handlePriceUpdate('wholesale', size, parseFloat(e.target.value) || 0)}
                              className="text-center font-semibold"
                              placeholder="0"
                            />
                            <div className="text-xs text-blue-700">
                              Rate per gram: ₹{((currentPrices.wholesale?.[size] || 0) / size).toFixed(2)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="border-t pt-6">
                  <h4 className="font-semibold text-gray-800 mb-4">Quick Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const updatedPrices = { ...currentPrices };
                        CONFIG.PACKET_SIZES.forEach(size => {
                          if (updatedPrices.retail[size] > 0) {
                            updatedPrices.wholesale[size] = Math.round(updatedPrices.retail[size] * 0.8);
                          }
                        });
                        setCurrentPrices(updatedPrices);
                        PaymentDataManager.saveSellingPrices(updatedPrices);
                      }}
                      className="border-blue-300 text-blue-700"
                    >
                      Set Wholesale = 80% of Retail
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const updatedPrices = { ...currentPrices };
                        CONFIG.PACKET_SIZES.forEach(size => {
                          if (updatedPrices.retail[size] > 0) {
                            updatedPrices.wholesale[size] = Math.round(updatedPrices.retail[size] * 0.75);
                          }
                        });
                        setCurrentPrices(updatedPrices);
                        PaymentDataManager.saveSellingPrices(updatedPrices);
                      }}
                      className="border-blue-300 text-blue-700"
                    >
                      Set Wholesale = 75% of Retail
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
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Save & Apply
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