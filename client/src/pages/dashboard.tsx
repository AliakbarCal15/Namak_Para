import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Home, 
  ClipboardList, 
  Cog, 
  TrendingUp, 
  Wallet, 
  Gem,
  Plus,
  Eye,
  Trash2,
  Save,
  X,
  DollarSign,
  Package,
  ShoppingCart,
  AlertTriangle,
  Calendar,
  Weight,
  Percent,
  Clock,
  CheckCircle,
  BarChart3,
  Calculator,
  FileText,
  Printer
} from 'lucide-react';

// ==========================================
// 📊 DATA MODELS & TYPES
// ==========================================

// बिजनेस के लिए सभी जरूरी types define कर रहे हैं
interface Order {
  id: number;
  customerName: string;
  deliveryDate: string;
  packages: PackageItem[];
  totalWeight: number;
  totalAmount: number;
  status: 'pending' | 'completed';
  priceType: 'retail' | 'wholesale'; // नया field for pricing type
  createdAt: string;
}

interface PackageItem {
  size: number; // packet size in grams (50g, 100g, etc.)
  quantity: number; // number of packets
  weight: number; // total weight for this package type
  amount: number; // total amount for this package type
}

interface Material {
  id: number;
  name: string;
  unit: string; // kg, litre, cylinder, etc.
  pricePerUnit: number;
  stock: number;
}

interface MaterialUsage {
  id: string;
  date: string;
  batchSize: number; // in kg
  materials: { [materialName: string]: number };
  totalCost: number;
  createdAt: string;
}

interface Payment {
  id: string;
  orderId: number;
  amount: number;
  date: string;
  mode: 'cash' | 'upi' | 'bank_transfer' | 'cheque';
  notes: string;
  createdAt: string;
}

// ==========================================
// 🛠️ BUSINESS CONFIGURATION
// ==========================================

const CONFIG = {
  // Production yield ratio - 1kg maida gives 1.4kg namak para
  YIELD_RATIO: 1.4,
  
  // Gas cost per minute of cooking
  GAS_COST_PER_MINUTE: 2, // ₹2 per minute
  
  // Available packet sizes in grams and their selling prices
  PACKET_SIZES: [50, 100, 250, 500, 1000],
  
  // Default selling prices per packet size (in grams) - ये editable हैं
  DEFAULT_SELLING_PRICES: {
    50: 15,    // ₹15 per 50g packet
    100: 25,   // ₹25 per 100g packet  
    250: 70,   // ₹70 per 250g packet
    500: 100,  // ₹100 per 500g packet
    1000: 250  // ₹250 per 1kg packet
  },
  
  // LocalStorage keys for data persistence
  STORAGE_KEYS: {
    orders: 'namakpara_orders',
    materials: 'namakpara_materials', 
    payments: 'namakpara_payments',
    usage: 'namakpara_usage'
  }
};

// ==========================================
// 🗄️ DATA MANAGEMENT CLASS
// ==========================================

class DataManager {
  // Initialize करने पर default materials set करते हैं और data migration भी करते हैं
  static initializeDefaultData() {
    // Initialize materials if not exists
    if (!DataManager.getMaterials().length) {
      DataManager.saveMaterials([
        { id: 1, name: 'Maida', unit: 'kg', pricePerUnit: 45, stock: 0 },
        { id: 2, name: 'Oil', unit: 'litre', pricePerUnit: 120, stock: 0 },
        { id: 3, name: 'Salt', unit: 'kg', pricePerUnit: 5, stock: 0 },
        { id: 4, name: 'Ajwain', unit: 'kg', pricePerUnit: 7, stock: 0 },
        { id: 5, name: 'Gas', unit: 'per kg production', pricePerUnit: 25, stock: 0 }
      ]);
    }
    
    // Migrate existing orders to include priceType field
    const orders = DataManager.getOrders();
    let needsUpdate = false;
    const updatedOrders = orders.map(order => {
      if (!order.priceType) {
        needsUpdate = true;
        return { ...order, priceType: 'retail' as const }; // Default to retail for existing orders
      }
      return order;
    });
    
    if (needsUpdate) {
      DataManager.saveOrders(updatedOrders);
    }
  }

  // Update material price - नई function for price editing
  static updateMaterialPrice(materialId: number, newPrice: number) {
    const materials = DataManager.getMaterials();
    const materialIndex = materials.findIndex(m => m.id === materialId);
    if (materialIndex !== -1) {
      materials[materialIndex].pricePerUnit = newPrice;
      DataManager.saveMaterials(materials);
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
    
    const stored = localStorage.getItem('namakpara_selling_prices');
    return stored ? JSON.parse(stored) : defaultPrices;
  }

  static saveSellingPrices(prices: { retail: { [key: number]: number }, wholesale: { [key: number]: number } }) {
    localStorage.setItem('namakpara_selling_prices', JSON.stringify(prices));
  }

  static updateSellingPrice(type: 'retail' | 'wholesale', size: number, newPrice: number) {
    const prices = DataManager.getSellingPrices();
    if (!prices[type]) prices[type] = {};
    prices[type][size] = newPrice;
    DataManager.saveSellingPrices(prices);
  }

  // Orders management - सभी orders को handle करते हैं
  static getOrders(): Order[] {
    return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.orders) || '[]');
  }

  static saveOrders(orders: Order[]) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.orders, JSON.stringify(orders));
  }

  static addOrder(order: Omit<Order, 'id' | 'createdAt'>): Order {
    const orders = DataManager.getOrders();
    const newOrder: Order = {
      ...order,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    orders.push(newOrder);
    DataManager.saveOrders(orders);
    return newOrder;
  }

  static deleteOrder(orderId: number) {
    const orders = DataManager.getOrders();
    const filteredOrders = orders.filter(o => o.id !== orderId);
    DataManager.saveOrders(filteredOrders);
  }

  // Materials management - सभी materials को handle करते हैं
  static getMaterials(): Material[] {
    return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.materials) || '[]');
  }

  static saveMaterials(materials: Material[]) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.materials, JSON.stringify(materials));
  }

  static updateMaterialStock(materialId: number, additionalStock: number) {
    const materials = DataManager.getMaterials();
    const materialIndex = materials.findIndex(m => m.id === materialId);
    if (materialIndex !== -1) {
      materials[materialIndex].stock += additionalStock;
      DataManager.saveMaterials(materials);
    }
  }

  // Payments management - सभी payments को handle करते हैं  
  static getPayments(): Payment[] {
    return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.payments) || '[]');
  }

  static savePayments(payments: Payment[]) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.payments, JSON.stringify(payments));
  }

  static addPayment(payment: Omit<Payment, 'id' | 'createdAt'>): Payment {
    const payments = DataManager.getPayments();
    const newPayment: Payment = {
      ...payment,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    payments.push(newPayment);
    DataManager.savePayments(payments);
    return newPayment;
  }

  // Material usage tracking - daily usage को track करते हैं
  static getMaterialUsage(): MaterialUsage[] {
    return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.usage) || '[]');
  }

  static saveMaterialUsage(usage: MaterialUsage[]) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.usage, JSON.stringify(usage));
  }

  static addMaterialUsage(usage: Omit<MaterialUsage, 'id' | 'createdAt'>): MaterialUsage {
    const usageList = DataManager.getMaterialUsage();
    const newUsage: MaterialUsage = {
      ...usage,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    usageList.push(newUsage);
    DataManager.saveMaterialUsage(usageList);
    return newUsage;
  }

  // Utility functions - common formatting functions
  static formatCurrency(amount: number): string {
    return `₹${parseFloat(amount.toString()).toLocaleString('en-IN')}`;
  }

  static formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-IN');
  }
}

// ==========================================
// 🧮 BUSINESS CALCULATIONS CLASS  
// ==========================================

class BusinessCalculator {
  // Material requirements calculate करते हैं based on production weight
  static calculateMaterialRequirements(totalWeightInGrams: number) {
    const weightInKg = totalWeightInGrams / 1000;
    
    return {
      maida: weightInKg / CONFIG.YIELD_RATIO, // 1.4kg output needs 1kg maida
      oil: weightInKg * 0.1, // 10% oil ratio
      salt: weightInKg * 0.02, // 2% salt ratio  
      ajwain: weightInKg * 0.01, // 1% ajwain ratio
      gasMinutes: Math.ceil(weightInKg / 5) * 30 // 30 minutes per 5kg batch
    };
  }

  // Production cost calculate करते हैं
  static calculateProductionCost(materialUsage: { [key: string]: number }): number {
    const materials = DataManager.getMaterials();
    let totalCost = 0;

    Object.entries(materialUsage).forEach(([materialName, quantity]) => {
      if (materialName === 'gasMinutes') {
        totalCost += quantity * CONFIG.GAS_COST_PER_MINUTE;
      } else {
        const material = materials.find(m => m.name.toLowerCase() === materialName.toLowerCase());
        if (material) {
          totalCost += quantity * material.pricePerUnit;
        }
      }
    });

    return totalCost;
  }

  // Order profit calculate करते हैं
  static calculateOrderProfit(order: Order): number {
    const requirements = BusinessCalculator.calculateMaterialRequirements(order.totalWeight);
    const productionCost = BusinessCalculator.calculateProductionCost(requirements);
    return order.totalAmount - productionCost;
  }

  // Today's business summary निकालते हैं
  static getTodaysSummary() {
    const today = new Date().toDateString();
    const orders = DataManager.getOrders().filter(order => 
      new Date(order.createdAt).toDateString() === today
    );

    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;
    const totalWeight = orders.reduce((sum, order) => sum + order.totalWeight, 0);

    return {
      totalSales,
      totalOrders, 
      totalWeight,
      avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0
    };
  }

  // Payment status calculate करते हैं per order
  static getPaymentStatus(orderId: number) {
    const payments = DataManager.getPayments().filter(p => p.orderId === orderId);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const order = DataManager.getOrders().find(o => o.id === orderId);
    const totalAmount = order?.totalAmount || 0;
    const pending = totalAmount - totalPaid;

    return {
      totalAmount,
      totalPaid,
      pending,
      status: pending <= 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Unpaid'
    };
  }
}

// ==========================================
// 🎯 MAIN DASHBOARD COMPONENT
// ==========================================

export default function Dashboard() {
  // Component state management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const { toast } = useToast();

  // Initialize default data और time update करते हैं
  useEffect(() => {
    DataManager.initializeDefaultData();
    const timer = setInterval(() => setCurrentDateTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Success toast helper function
  const showSuccess = (message: string) => {
    toast({
      title: "Success!",
      description: message,
      duration: 3000,
    });
  };

  // Error toast helper function  
  const showError = (message: string) => {
    toast({
      title: "Error!",
      description: message,
      variant: "destructive",
      duration: 3000,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section - App branding और current time */}
      <header className="gradient-bg text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold">🧂 CrunchTrack</h1>
                <p className="text-sm opacity-90">From Flour to Fortune — Track It All!</p>
              </div>
            </div>
            <div className="text-right mt-2 md:mt-0">
              <div className="text-sm font-medium">
                {currentDateTime.toLocaleString('en-IN', {
                  weekday: 'short',
                  year: 'numeric', 
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div className="text-xs opacity-80">Namak Para Business Suite</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Tabs Navigation */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Navigation Tabs */}
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center gap-2">
              <Cog className="w-4 h-4" />
              <span className="hidden sm:inline">Materials</span>
            </TabsTrigger>
            <TabsTrigger value="profit" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Profit</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="forecast" className="flex items-center gap-2">
              <Gem className="w-4 h-4" />
              <span className="hidden sm:inline">Forecast</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          
          {/* ==========================================
              📊 DASHBOARD TAB - Business overview
              ========================================== */}
          <TabsContent value="dashboard" className="space-y-6">
            <DashboardContent />
          </TabsContent>

          {/* ==========================================
              📋 ORDERS TAB - Order management  
              ========================================== */}
          <TabsContent value="orders" className="space-y-6">
            <OrdersContent 
              showOrderForm={showOrderForm}
              setShowOrderForm={setShowOrderForm}
              showSuccess={showSuccess}
              showError={showError}
            />
          </TabsContent>

          {/* ==========================================
              ⚙️ MATERIALS TAB - Material tracking
              ========================================== */}
          <TabsContent value="materials" className="space-y-6">
            <MaterialsContent 
              showMaterialForm={showMaterialForm}
              setShowMaterialForm={setShowMaterialForm}
              showSuccess={showSuccess}
              showError={showError}
            />
          </TabsContent>

          {/* ==========================================
              📈 PROFIT TAB - Profit analysis
              ========================================== */}
          <TabsContent value="profit" className="space-y-6">
            <ProfitContent />
          </TabsContent>

          {/* ==========================================
              💰 PAYMENTS TAB - Payment tracking
              ========================================== */}
          <TabsContent value="payments" className="space-y-6">
            <PaymentsContent 
              showPaymentForm={showPaymentForm}
              setShowPaymentForm={setShowPaymentForm}
              showSuccess={showSuccess}
              showError={showError}
            />
          </TabsContent>

          {/* ==========================================
              🔮 FORECAST TAB - Future planning
              ========================================== */}
          <TabsContent value="forecast" className="space-y-6">
            <ForecastContent />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-4 text-center text-sm no-print">
        <p>&copy; 2024 CrunchTrack Business Suite | Made with ❤️ for Namak Para Business</p>
      </footer>
    </div>
  );
}

// ==========================================
// 📊 DASHBOARD CONTENT COMPONENT
// ==========================================

function DashboardContent() {
  // State management for dynamic updates जब payments add होती हैं
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Real-time data refresh mechanism
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 2000); // Refresh every 2 seconds to catch payment updates
    
    return () => clearInterval(interval);
  }, []);

  const summary = BusinessCalculator.getTodaysSummary();
  const orders = DataManager.getOrders();
  const payments = DataManager.getPayments();
  
  // Calculate pending payments across all orders
  const totalDue = orders.reduce((sum, order) => {
    const paymentStatus = BusinessCalculator.getPaymentStatus(order.id);
    return sum + paymentStatus.pending;
  }, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">📊 Business Dashboard</h2>
        <Button onClick={() => window.print()} variant="outline" className="no-print">
          <Printer className="w-4 h-4 mr-2" />
          Print Report
        </Button>
      </div>

      {/* Key Metrics Cards - Dynamic updates के साथ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" key={refreshKey}>
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Sales</p>
                <p className="text-2xl font-bold text-green-600">
                  {DataManager.formatCurrency(summary.totalSales)}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Orders Today</p>
                <p className="text-2xl font-bold text-blue-600">{summary.totalOrders}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Production Today</p>
                <p className="text-2xl font-bold text-purple-600">{summary.totalWeight}g</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Weight className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Due</p>
                <p className="text-2xl font-bold text-red-600">
                  {DataManager.formatCurrency(totalDue)}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.slice(-5).reverse().map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.customerName}</TableCell>
                    <TableCell>{DataManager.formatDate(order.createdAt)}</TableCell>
                    <TableCell>{order.totalWeight}g</TableCell>
                    <TableCell>{DataManager.formatCurrency(order.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Completed
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No orders yet. Start by creating your first order!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// 📋 ORDERS CONTENT COMPONENT
// ==========================================

interface OrdersContentProps {
  showOrderForm: boolean;
  setShowOrderForm: (show: boolean) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

function OrdersContent({ showOrderForm, setShowOrderForm, showSuccess, showError }: OrdersContentProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Load orders on component mount
  useEffect(() => {
    setOrders(DataManager.getOrders());
  }, []);

  const refreshOrders = () => {
    setOrders(DataManager.getOrders());
  };

  const handleDeleteOrder = (orderId: number) => {
    if (window.confirm('Are you sure you want to delete this order? यह action undo नहीं हो सकता!')) {
      DataManager.deleteOrder(orderId);
      refreshOrders();
      showSuccess('Order deleted successfully!');
    }
  };

  // Filter orders based on search and date
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !filterDate || order.deliveryDate === filterDate;
    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800">📋 Orders Management</h2>
        <Button onClick={() => setShowOrderForm(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add New Order
        </Button>
      </div>

      {/* Order Form Modal */}
      {showOrderForm && (
        <OrderForm 
          onClose={() => setShowOrderForm(false)}
          onSuccess={(message) => {
            showSuccess(message);
            refreshOrders();
          }}
          onError={showError}
        />
      )}

      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search by Customer</Label>
              <Input
                id="search"
                placeholder="Enter customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="filterDate">Filter by Delivery Date</Label>
              <Input
                id="filterDate"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Price Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map(order => (
                  <TableRow key={order.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-xs">
                      #{order.id.toString().slice(-6)}
                    </TableCell>
                    <TableCell className="font-medium">{order.customerName}</TableCell>
                    <TableCell>{DataManager.formatDate(order.createdAt)}</TableCell>
                    <TableCell>{DataManager.formatDate(order.deliveryDate)}</TableCell>
                    <TableCell>{order.totalWeight}g</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.priceType === 'wholesale' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {order.priceType === 'wholesale' ? '🏭 Wholesale' : '🏪 Retail'}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {DataManager.formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {/* View order details modal */}}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteOrder(order.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      {orders.length === 0 ? 'No orders yet. Create your first order!' : 'No orders match your search criteria.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// 📝 ORDER FORM COMPONENT
// ==========================================

interface OrderFormProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

function OrderForm({ onClose, onSuccess, onError }: OrderFormProps) {
  const [customerName, setCustomerName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [packages, setPackages] = useState<{ [key: number]: number }>({});
  const [priceType, setPriceType] = useState<'retail' | 'wholesale'>('retail');
  const [currentPrices, setCurrentPrices] = useState(DataManager.getSellingPrices());

  // Set tomorrow as default delivery date
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDeliveryDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const updatePackageQuantity = (size: number, quantity: number) => {
    setPackages(prev => ({
      ...prev,
      [size]: Math.max(0, quantity)
    }));
  };

  // Calculate order summary in real-time using dynamic pricing and selected price type
  // Safe calculation with proper null checks - defensive programming approach
  const calculateSummary = () => {
    let totalWeight = 0;
    let totalPackets = 0;
    let totalAmount = 0;
    
    try {
      const allPrices = DataManager.getSellingPrices();
      
      // Safe access with multiple fallbacks - यहाँ safe access pattern use कर रहे हैं
      let selectedPrices;
      if (allPrices && typeof allPrices === 'object') {
        selectedPrices = allPrices[priceType] || allPrices.retail || {};
      } else {
        // Fallback default prices if data structure is corrupted
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
        
        // Safe price access with fallback calculation
        let pricePerPacket = 0;
        if (selectedPrices && selectedPrices[size]) {
          pricePerPacket = selectedPrices[size];
        } else {
          // Fallback calculation if price not found
          pricePerPacket = priceType === 'wholesale' ? (size * 0.2) : (size * 0.25);
        }
        
        const amount = pricePerPacket * qty;

        totalWeight += weight;
        totalPackets += qty;
        totalAmount += amount;
      });
    } catch (error) {
      console.error('Error in calculateSummary:', error);
      // Return safe defaults on error
      return { totalWeight: 0, totalPackets: 0, totalAmount: 0 };
    }

    return { totalWeight, totalPackets, totalAmount };
  };

  const summary = calculateSummary();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName.trim()) {
      onError('कृपया customer name भरें!');
      return;
    }

    if (!deliveryDate) {
      onError('कृपया delivery date select करें!');
      return;
    }

    if (summary.totalPackets === 0) {
      onError('कृपया कम से कम एक package का order दें!');
      return;
    }

    // Create package items array with current pricing and selected price type
    // Safe pricing access - same defensive pattern as calculateSummary
    const allPrices = DataManager.getSellingPrices();
    let selectedPrices;
    
    if (allPrices && typeof allPrices === 'object') {
      selectedPrices = allPrices[priceType] || allPrices.retail || {};
    } else {
      // Fallback default prices if data structure is corrupted
      selectedPrices = {
        50: priceType === 'wholesale' ? 12 : 15,
        100: priceType === 'wholesale' ? 20 : 25,
        250: priceType === 'wholesale' ? 56 : 70,
        500: priceType === 'wholesale' ? 80 : 100,
        1000: priceType === 'wholesale' ? 200 : 250
      };
    }
    
    const packageItems: PackageItem[] = CONFIG.PACKET_SIZES
      .filter(size => packages[size] > 0)
      .map(size => {
        const qty = packages[size];
        
        // Safe price access with fallback
        let pricePerPacket = 0;
        if (selectedPrices && selectedPrices[size]) {
          pricePerPacket = selectedPrices[size];
        } else {
          // Fallback calculation if price not found
          pricePerPacket = priceType === 'wholesale' ? (size * 0.2) : (size * 0.25);
        }
        
        return {
          size,
          quantity: qty,
          weight: size * qty,
          amount: pricePerPacket * qty
        };
      });

    const orderData = {
      customerName: customerName.trim(),
      deliveryDate,
      packages: packageItems,
      totalWeight: summary.totalWeight,
      totalAmount: summary.totalAmount,
      priceType, // नया field for pricing type
      status: 'pending' as const
    };

    try {
      DataManager.addOrder(orderData);
      onSuccess('✅ Order successfully created!');
      onClose();
    } catch (error) {
      onError('Order create करने में error आया!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Order
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Order Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="deliveryDate">Delivery Date *</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Pricing Type *</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Button
                    type="button"
                    variant={priceType === 'retail' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPriceType('retail')}
                    className={priceType === 'retail' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    🏪 Retail
                  </Button>
                  <Button
                    type="button"
                    variant={priceType === 'wholesale' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPriceType('wholesale')}
                    className={priceType === 'wholesale' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                  >
                    🏭 Wholesale
                  </Button>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {priceType === 'wholesale' ? 'Lower rates for bulk orders' : 'Standard customer rates'}
                </div>
              </div>
            </div>

            {/* Package Selection */}
            <div>
              <Label className="text-base font-semibold">
                Select Packages ({priceType === 'wholesale' ? '🏭 Wholesale' : '🏪 Retail'} Rates)
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-3">
                {CONFIG.PACKET_SIZES.map(size => {
                  // Safe pricing access - consistent with calculateSummary function
                  const allPrices = DataManager.getSellingPrices();
                  let selectedPrices;
                  let currentRate = 0;
                  
                  if (allPrices && typeof allPrices === 'object') {
                    selectedPrices = allPrices[priceType] || allPrices.retail || {};
                    currentRate = selectedPrices[size] || 0;
                  }
                  
                  // Fallback calculation if price not found
                  if (currentRate === 0) {
                    currentRate = priceType === 'wholesale' ? (size * 0.2) : (size * 0.25);
                  }
                  
                  return (
                    <Card key={size} className={`p-3 ${priceType === 'wholesale' ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}>
                      <div className="text-center">
                        <h4 className="font-semibold text-gray-800 mb-2">{size}g Packets</h4>
                        <Input
                          type="number"
                          min="0"
                          value={packages[size] || ''}
                          onChange={(e) => updatePackageQuantity(size, parseInt(e.target.value) || 0)}
                          placeholder="Qty"
                          className="text-center mb-2 h-8"
                        />
                        <div className={`text-xs ${priceType === 'wholesale' ? 'text-blue-700' : 'text-green-700'} font-medium`}>
                          Rate: ₹{currentRate}/packet
                        </div>
                        {packages[size] > 0 && (
                          <div className="text-xs text-primary font-bold mt-1">
                            Total: {DataManager.formatCurrency(currentRate * packages[size])}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Order Summary */}
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
                    <span>{DataManager.formatCurrency(summary.totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                Save Order
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// ⚙️ MATERIALS CONTENT COMPONENT
// ==========================================

interface MaterialsContentProps {
  showMaterialForm: boolean;
  setShowMaterialForm: (show: boolean) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

function MaterialsContent({ showMaterialForm, setShowMaterialForm, showSuccess, showError }: MaterialsContentProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [usageHistory, setUsageHistory] = useState<MaterialUsage[]>([]);

  useEffect(() => {
    setMaterials(DataManager.getMaterials());
    setUsageHistory(DataManager.getMaterialUsage());
  }, []);

  const refreshData = () => {
    setMaterials(DataManager.getMaterials());
    setUsageHistory(DataManager.getMaterialUsage());
  };

  const handleStockUpdate = (materialId: number, additionalStock: number) => {
    if (additionalStock <= 0) {
      showError('कृपया सही quantity enter करें!');
      return;
    }

    DataManager.updateMaterialStock(materialId, additionalStock);
    refreshData();
    
    const material = materials.find(m => m.id === materialId);
    showSuccess(`✅ Stock updated for ${material?.name}!`);
  };

  const handlePriceUpdate = (materialId: number, newPrice: number) => {
    if (newPrice <= 0) {
      showError('कृपया सही price enter करें!');
      return;
    }

    DataManager.updateMaterialPrice(materialId, newPrice);
    refreshData();
    
    const material = materials.find(m => m.id === materialId);
    showSuccess(`✅ Price updated for ${material?.name}!`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800">⚙️ Materials Management</h2>
        <Button onClick={() => setShowMaterialForm(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Record Usage
        </Button>
      </div>

      {/* Material Usage Form */}
      {showMaterialForm && (
        <MaterialUsageForm
          onClose={() => setShowMaterialForm(false)}
          onSuccess={(message) => {
            showSuccess(message);
            refreshData();
          }}
          onError={showError}
        />
      )}

      {/* Materials Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.map(material => (
          <MaterialCard
            key={material.id}
            material={material}
            onStockUpdate={handleStockUpdate}
            onPriceUpdate={handlePriceUpdate}
          />
        ))}
      </div>

      {/* Product Pricing Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Product Selling Prices (Click to Edit)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProductPricingSection showSuccess={showSuccess} showError={showError} />
        </CardContent>
      </Card>

      {/* Usage History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Recent Usage History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Batch Size</TableHead>
                  <TableHead>Maida Used</TableHead>
                  <TableHead>Oil Used</TableHead>
                  <TableHead>Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageHistory.slice(-10).reverse().map(usage => (
                  <TableRow key={usage.id}>
                    <TableCell>{DataManager.formatDate(usage.date)}</TableCell>
                    <TableCell>{usage.batchSize}kg</TableCell>
                    <TableCell>{usage.materials.maida?.toFixed(2) || 0}kg</TableCell>
                    <TableCell>{usage.materials.oil?.toFixed(2) || 0}L</TableCell>
                    <TableCell className="font-semibold text-red-600">
                      {DataManager.formatCurrency(usage.totalCost)}
                    </TableCell>
                  </TableRow>
                ))}
                {usageHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No usage recorded yet. Start by recording your first batch!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// 📦 MATERIAL CARD COMPONENT
// ==========================================

interface MaterialCardProps {
  material: Material;
  onStockUpdate: (materialId: number, quantity: number) => void;
  onPriceUpdate?: (materialId: number, newPrice: number) => void;
}

function MaterialCard({ material, onStockUpdate, onPriceUpdate }: MaterialCardProps) {
  const [additionalStock, setAdditionalStock] = useState('');
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState(material.pricePerUnit.toString());

  const handleStockUpdate = () => {
    const quantity = parseFloat(additionalStock);
    if (quantity > 0) {
      onStockUpdate(material.id, quantity);
      setAdditionalStock('');
    }
  };

  const handlePriceUpdate = () => {
    const price = parseFloat(newPrice);
    if (price > 0 && onPriceUpdate) {
      onPriceUpdate(material.id, price);
      setIsEditingPrice(false);
    }
  };

  const cancelPriceEdit = () => {
    setNewPrice(material.pricePerUnit.toString());
    setIsEditingPrice(false);
  };

  return (
    <Card className="card-hover">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">{material.name}</h3>
          <div className="text-right">
            <div className="text-sm text-gray-600">Rate</div>
            {isEditingPrice ? (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-20 h-8 text-sm"
                  min="0"
                  step="0.1"
                />
                <div className="flex gap-1">
                  <Button size="sm" onClick={handlePriceUpdate} className="h-8 px-2">
                    <CheckCircle className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelPriceEdit} className="h-8 px-2">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                className="font-semibold text-primary cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                onClick={() => setIsEditingPrice(true)}
                title="Click to edit price"
              >
                {DataManager.formatCurrency(material.pricePerUnit)}/{material.unit}
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Current Stock:</span>
            <span className="font-medium">{material.stock} {material.unit}</span>
          </div>
          
          {/* Quick stock update */}
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              step="0.1"
              placeholder="Add stock"
              value={additionalStock}
              onChange={(e) => setAdditionalStock(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleStockUpdate} size="sm">
              Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==========================================
// 💰 PRODUCT PRICING SECTION COMPONENT
// ==========================================

interface ProductPricingSectionProps {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

function ProductPricingSection({ showSuccess, showError }: ProductPricingSectionProps) {
  const [sellingPrices, setSellingPrices] = useState(DataManager.getSellingPrices());
  const [editingSize, setEditingSize] = useState<number | null>(null);
  const [tempPrice, setTempPrice] = useState('');
  const [priceType, setPriceType] = useState<'retail' | 'wholesale'>('retail');

  const startEdit = (size: number) => {
    setEditingSize(size);
    const currentPrices = sellingPrices[priceType] || sellingPrices.retail;
    setTempPrice(currentPrices[size]?.toString() || '0');
  };

  const savePrice = () => {
    if (editingSize !== null) {
      const newPrice = parseFloat(tempPrice);
      if (newPrice > 0) {
        DataManager.updateSellingPrice(priceType, editingSize, newPrice);
        setSellingPrices(DataManager.getSellingPrices());
        setEditingSize(null);
        showSuccess(`✅ ${priceType} price updated for ${editingSize}g packets!`);
      } else {
        showError('कृपया सही price enter करें!');
      }
    }
  };

  const cancelEdit = () => {
    setEditingSize(null);
    setTempPrice('');
  };

  return (
    <div className="space-y-4">
      {/* Toggle for Retail/Wholesale */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Product Selling Prices (Click to Edit)</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant={priceType === 'retail' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPriceType('retail')}
            className={priceType === 'retail' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            🏪 Retail
          </Button>
          <Button
            variant={priceType === 'wholesale' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPriceType('wholesale')}
            className={priceType === 'wholesale' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            🏭 Wholesale
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {CONFIG.PACKET_SIZES.map(size => {
          // Safe pricing access - consistent defensive programming pattern
          let currentPrice = 0;
          if (sellingPrices && typeof sellingPrices === 'object') {
            const currentPrices = sellingPrices[priceType] || sellingPrices.retail || {};
            currentPrice = currentPrices[size] || 0;
          }
          
          // Fallback calculation if price not found
          if (currentPrice === 0) {
            currentPrice = priceType === 'wholesale' ? (size * 0.2) : (size * 0.25);
          }
          
          return (
            <div 
              key={size} 
              className={`p-4 border rounded-lg hover:bg-gray-50 ${priceType === 'wholesale' ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}
            >
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-700 mb-2">
                  {size}g Packet
                </div>
                
                {editingSize === size ? (
                  <div className="space-y-2">
                    <Input
                      type="number"
                      value={tempPrice}
                      onChange={(e) => setTempPrice(e.target.value)}
                      className="text-center h-8"
                      min="0"
                      step="1"
                      autoFocus
                    />
                    <div className="flex gap-1 justify-center">
                      <Button size="sm" onClick={savePrice} className="h-7 px-2">
                        <CheckCircle className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} className="h-7 px-2">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`text-xl font-bold cursor-pointer hover:bg-opacity-80 px-3 py-2 rounded transition-colors ${
                      priceType === 'wholesale' ? 'text-blue-700 hover:bg-blue-700 hover:text-white' : 'text-green-700 hover:bg-green-700 hover:text-white'
                    }`}
                    onClick={() => startEdit(size)}
                    title="Click to edit price"
                  >
                    ₹{currentPrice}
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mt-1">
                  {priceType} price
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 📝 MATERIAL USAGE FORM COMPONENT  
// ==========================================

interface MaterialUsageFormProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

function MaterialUsageForm({ onClose, onSuccess, onError }: MaterialUsageFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchSize, setBatchSize] = useState('');
  const [requirements, setRequirements] = useState<{ [key: string]: number }>({});

  // Calculate requirements when batch size changes
  useEffect(() => {
    const batch = parseFloat(batchSize);
    if (batch > 0) {
      const reqs = BusinessCalculator.calculateMaterialRequirements(batch * 1000);
      setRequirements(reqs);
    } else {
      setRequirements({});
    }
  }, [batchSize]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const batch = parseFloat(batchSize);
    if (!batch || batch <= 0) {
      onError('कृपया सही batch size enter करें!');
      return;
    }

    const totalCost = BusinessCalculator.calculateProductionCost(requirements);
    
    const usageData = {
      date,
      batchSize: batch,
      materials: requirements,
      totalCost
    };

    try {
      DataManager.addMaterialUsage(usageData);
      onSuccess('✅ Material usage recorded successfully!');
      onClose();
    } catch (error) {
      onError('Usage record करने में error आया!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Record Material Usage
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="usageDate">Date</Label>
                <Input
                  id="usageDate"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="batchSize">Production Batch (kg)</Label>
                <Input
                  id="batchSize"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Enter total production"
                  value={batchSize}
                  onChange={(e) => setBatchSize(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Auto-calculated requirements */}
            {Object.keys(requirements).length > 0 && (
              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <h4 className="font-medium text-blue-800 mb-3">🧮 Auto-Calculated Requirements</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {Object.entries(requirements).map(([materialName, quantity]) => {
                      if (materialName === 'gasMinutes') {
                        const cost = quantity * CONFIG.GAS_COST_PER_MINUTE;
                        return (
                          <div key={materialName} className="flex justify-between">
                            <span>Gas Usage:</span>
                            <span className="font-medium">
                              {quantity} minutes ({DataManager.formatCurrency(cost)})
                            </span>
                          </div>
                        );
                      } else {
                        const materials = DataManager.getMaterials();
                        const material = materials.find(m => m.name.toLowerCase() === materialName.toLowerCase());
                        const cost = material ? quantity * material.pricePerUnit : 0;
                        return (
                          <div key={materialName} className="flex justify-between">
                            <span>{materialName.charAt(0).toUpperCase() + materialName.slice(1)}:</span>
                            <span className="font-medium">
                              {quantity.toFixed(2)} {material?.unit || 'units'} ({DataManager.formatCurrency(cost)})
                            </span>
                          </div>
                        );
                      }
                    })}
                    <div className="flex justify-between border-t pt-2 font-semibold text-lg col-span-2">
                      <span>Total Cost:</span>
                      <span className="text-primary">
                        {DataManager.formatCurrency(BusinessCalculator.calculateProductionCost(requirements))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-4">
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                Record Usage
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// 📈 PROFIT CONTENT COMPONENT
// ==========================================

function ProfitContent() {
  // State management for dynamic updates
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentPrices, setCurrentPrices] = useState(DataManager.getSellingPrices());
  const [currentMaterials, setCurrentMaterials] = useState(DataManager.getMaterials());

  // Force refresh when prices change - refresh को trigger करने के लिए
  useEffect(() => {
    const interval = setInterval(() => {
      const newPrices = DataManager.getSellingPrices();
      const newMaterials = DataManager.getMaterials();
      
      // Check if prices changed - price में change हुआ है या नहीं check करते हैं
      if (JSON.stringify(newPrices) !== JSON.stringify(currentPrices) ||
          JSON.stringify(newMaterials) !== JSON.stringify(currentMaterials)) {
        setCurrentPrices(newPrices);
        setCurrentMaterials(newMaterials);
        setRefreshKey(prev => prev + 1);
      }
    }, 1000); // Check every second for price changes

    return () => clearInterval(interval);
  }, [currentPrices, currentMaterials]);

  const orders = DataManager.getOrders();
  const payments = DataManager.getPayments();
  
  // Calculate overall profit metrics with real pricing
  let totalRevenue = 0;
  let totalCost = 0;
  let totalPaid = 0;
  
  orders.forEach(order => {
    totalRevenue += order.totalAmount;
    // Calculate real cost using current material prices और actual requirements
    const requirements = BusinessCalculator.calculateMaterialRequirements(order.totalWeight);
    const realCost = BusinessCalculator.calculateProductionCost(requirements);
    totalCost += realCost;
  });

  // Calculate total payments received
  payments.forEach(payment => {
    totalPaid += payment.amount;
  });

  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;
  const pendingAmount = totalRevenue - totalPaid;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">📈 Profit Analysis</h2>
        <Button onClick={() => window.print()} variant="outline" className="no-print">
          <Printer className="w-4 h-4 mr-2" />
          Print Report
        </Button>
      </div>

      {/* Profit Overview Cards - Dynamic updates के साथ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4" key={refreshKey}>
        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <h3 className="text-xs font-medium text-gray-600">Total Revenue</h3>
            <p className="text-lg font-bold text-green-600">
              {DataManager.formatCurrency(totalRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <h3 className="text-xs font-medium text-gray-600">Total Cost</h3>
            <p className="text-lg font-bold text-red-600">
              {DataManager.formatCurrency(totalCost)}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <h3 className="text-xs font-medium text-gray-600">Net Profit</h3>
            <p className={`text-lg font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {DataManager.formatCurrency(totalProfit)}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <Wallet className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <h3 className="text-xs font-medium text-gray-600">Total Paid</h3>
            <p className="text-lg font-bold text-purple-600">
              {DataManager.formatCurrency(totalPaid)}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <h3 className="text-xs font-medium text-gray-600">Pending Due</h3>
            <p className="text-lg font-bold text-orange-600">
              {DataManager.formatCurrency(pendingAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profit Margin and Key Metrics */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <Percent className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="text-sm font-medium text-gray-600">Profit Margin</h3>
              <p className="text-2xl font-bold text-purple-600">{profitMargin.toFixed(1)}%</p>
            </div>
            <div>
              <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="text-sm font-medium text-gray-600">Total Orders</h3>
              <p className="text-2xl font-bold text-blue-600">{orders.length}</p>
            </div>
            <div>
              <Calculator className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="text-sm font-medium text-gray-600">Avg Order Value</h3>
              <p className="text-2xl font-bold text-green-600">
                {orders.length > 0 ? DataManager.formatCurrency(totalRevenue / orders.length) : '₹0'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profit per Package Size - Dynamic calculations के साथ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Profit per Package Size (Real-time)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4" key={`package-${refreshKey}`}>
            {CONFIG.PACKET_SIZES.map(size => {
              // Show both retail and wholesale profit analysis - Safe access pattern
              let retailPrice = 0;
              let wholesalePrice = 0;
              
              if (currentPrices && typeof currentPrices === 'object') {
                retailPrice = currentPrices.retail?.[size] || 0;
                wholesalePrice = currentPrices.wholesale?.[size] || 0;
              }
              
              // Fallback calculation if prices not found
              if (retailPrice === 0) {
                retailPrice = size * 0.25; // Default retail calculation
              }
              if (wholesalePrice === 0) {
                wholesalePrice = size * 0.2; // Default wholesale calculation  
              }
              
              // Real cost calculation using current material prices
              const requirements = BusinessCalculator.calculateMaterialRequirements(size);
              const realCostPrice = BusinessCalculator.calculateProductionCost(requirements);
              
              const retailProfit = retailPrice - realCostPrice;
              const wholesaleProfit = wholesalePrice - realCostPrice;
              const retailMargin = retailPrice > 0 ? (retailProfit / retailPrice * 100) : 0;
              const wholesaleMargin = wholesalePrice > 0 ? (wholesaleProfit / wholesalePrice * 100) : 0;
              
              return (
                <Card key={size} className="border-gray-200">
                  <CardContent className="p-3 text-center">
                    <h4 className="font-semibold text-gray-800 mb-2">{size}g Packet</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b pb-1">
                        <span>Cost:</span>
                        <span className="font-medium text-red-700">{DataManager.formatCurrency(realCostPrice)}</span>
                      </div>
                      
                      {/* Retail Analysis */}
                      <div className="bg-green-50 p-2 rounded">
                        <div className="font-medium text-green-800 mb-1">🏪 Retail</div>
                        <div className="flex justify-between">
                          <span>Price:</span>
                          <span className="font-medium">{DataManager.formatCurrency(retailPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Profit:</span>
                          <span className={retailProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {DataManager.formatCurrency(retailProfit)}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-green-700">
                          {retailMargin.toFixed(1)}% margin
                        </div>
                      </div>
                      
                      {/* Wholesale Analysis */}
                      <div className="bg-blue-50 p-2 rounded">
                        <div className="font-medium text-blue-800 mb-1">🏭 Wholesale</div>
                        <div className="flex justify-between">
                          <span>Price:</span>
                          <span className="font-medium">{DataManager.formatCurrency(wholesalePrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Profit:</span>
                          <span className={wholesaleProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {DataManager.formatCurrency(wholesaleProfit)}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-blue-700">
                          {wholesaleMargin.toFixed(1)}% margin
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Profit Breakdown by Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Profit Breakdown by Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Est. Cost</TableHead>
                  <TableHead>Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.slice(-10).reverse().map(order => {
                  // Real cost calculation using current material prices
                  const requirements = BusinessCalculator.calculateMaterialRequirements(order.totalWeight);
                  const realCost = BusinessCalculator.calculateProductionCost(requirements);
                  const profit = order.totalAmount - realCost;
                  
                  // Payment status for this order
                  const paymentStatus = BusinessCalculator.getPaymentStatus(order.id);
                  
                  return (
                    <TableRow key={order.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{order.customerName}</TableCell>
                      <TableCell>{DataManager.formatDate(order.createdAt)}</TableCell>
                      <TableCell>{order.totalWeight}g</TableCell>
                      <TableCell className="text-green-600">
                        {DataManager.formatCurrency(order.totalAmount)}
                      </TableCell>
                      <TableCell className="text-red-600">
                        {DataManager.formatCurrency(realCost)}
                      </TableCell>
                      <TableCell className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {DataManager.formatCurrency(profit)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No orders yet. Create orders to see profit analysis!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cost Optimization Tips */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-800">💡 Profit Optimization Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-yellow-800">Cost Reduction:</h4>
              <ul className="space-y-1 text-yellow-700">
                <li>• Buy materials in bulk for better rates</li>
                <li>• Monitor gas usage efficiency</li>
                <li>• Reduce material wastage</li>
                <li>• Optimize batch sizes</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-yellow-800">Revenue Increase:</h4>
              <ul className="space-y-1 text-yellow-700">
                <li>• Focus on higher margin packages</li>
                <li>• Offer bulk discounts for large orders</li>
                <li>• Introduce premium variants</li>
                <li>• Expand customer base</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// 💰 PAYMENTS CONTENT COMPONENT
// ==========================================

interface PaymentsContentProps {
  showPaymentForm: boolean;
  setShowPaymentForm: (show: boolean) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

function PaymentsContent({ showPaymentForm, setShowPaymentForm, showSuccess, showError }: PaymentsContentProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const orders = DataManager.getOrders();
  
  useEffect(() => {
    setPayments(DataManager.getPayments());
  }, []);

  const refreshPayments = () => {
    setPayments(DataManager.getPayments());
  };

  // Calculate payment summary
  let totalReceivable = 0;
  let totalReceived = 0;
  let totalPending = 0;

  const paymentSummary = orders.map(order => {
    const paymentStatus = BusinessCalculator.getPaymentStatus(order.id);
    totalReceivable += paymentStatus.totalAmount;
    totalReceived += paymentStatus.totalPaid;
    totalPending += paymentStatus.pending;
    
    return {
      ...order,
      ...paymentStatus
    };
  });

  const handleQuickPayment = (orderId: number, pendingAmount: number) => {
    if (window.confirm(`Record full payment of ${DataManager.formatCurrency(pendingAmount)}?`)) {
      const paymentData = {
        orderId,
        amount: pendingAmount,
        date: new Date().toISOString().split('T')[0],
        mode: 'cash' as const,
        notes: 'Quick payment'
      };

      try {
        DataManager.addPayment(paymentData);
        refreshPayments();
        showSuccess('✅ Payment recorded successfully!');
      } catch (error) {
        showError('Payment record करने में error आया!');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800">💰 Payment Tracking</h2>
        <Button onClick={() => setShowPaymentForm(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Record Payment
        </Button>
      </div>

      {/* Payment Form */}
      {showPaymentForm && (
        <PaymentForm
          onClose={() => setShowPaymentForm(false)}
          onSuccess={(message) => {
            showSuccess(message);
            refreshPayments();
          }}
          onError={showError}
        />
      )}

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-hover">
          <CardContent className="p-6 text-center">
            <Wallet className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-600">Total Receivable</h3>
            <p className="text-2xl font-bold text-blue-600">
              {DataManager.formatCurrency(totalReceivable)}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-600">Total Received</h3>
            <p className="text-2xl font-bold text-green-600">
              {DataManager.formatCurrency(totalReceived)}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6 text-center">
            <Clock className="w-8 h-8 text-red-600 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-600">Total Pending</h3>
            <p className="text-2xl font-bold text-red-600">
              {DataManager.formatCurrency(totalPending)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Payment Status ({orders.length} orders)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentSummary.map(order => (
                  <TableRow key={order.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{order.customerName}</TableCell>
                    <TableCell>{DataManager.formatDate(order.createdAt)}</TableCell>
                    <TableCell className="font-semibold">
                      {DataManager.formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell className="text-green-600">
                      {DataManager.formatCurrency(order.totalPaid)}
                    </TableCell>
                    <TableCell className="text-red-600">
                      {DataManager.formatCurrency(order.pending)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className={
                          order.status === 'Paid' ? 'bg-green-100 text-green-800' :
                          order.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.pending > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuickPayment(order.id, order.pending)}
                        >
                          <DollarSign className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No orders yet. Create orders to track payments!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// 💳 PAYMENT FORM COMPONENT
// ==========================================

interface PaymentFormProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

function PaymentForm({ onClose, onSuccess, onError }: PaymentFormProps) {
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState('cash');
  const [notes, setNotes] = useState('');

  const orders = DataManager.getOrders();
  
  // Get orders with pending payments
  const pendingOrders = orders.map(order => {
    const paymentStatus = BusinessCalculator.getPaymentStatus(order.id);
    return {
      ...order,
      ...paymentStatus
    };
  }).filter(order => order.pending > 0);

  const handleOrderChange = (selectedOrderId: string) => {
    setOrderId(selectedOrderId);
    const order = pendingOrders.find(o => o.id.toString() === selectedOrderId);
    if (order) {
      setAmount(order.pending.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderId) {
      onError('कृपया order select करें!');
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      onError('कृपया सही amount enter करें!');
      return;
    }

    const order = pendingOrders.find(o => o.id.toString() === orderId);
    if (order && paymentAmount > order.pending) {
      onError('Payment amount pending amount से ज्यादा नहीं हो सकता!');
      return;
    }

    const paymentData = {
      orderId: parseInt(orderId),
      amount: paymentAmount,
      date,
      mode: mode as 'cash' | 'upi' | 'bank_transfer' | 'cheque',
      notes: notes.trim()
    };

    try {
      DataManager.addPayment(paymentData);
      onSuccess('✅ Payment recorded successfully!');
      onClose();
    } catch (error) {
      onError('Payment record करने में error आया!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Record Payment
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="paymentOrderId">Select Order *</Label>
              <Select value={orderId} onValueChange={handleOrderChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an order..." />
                </SelectTrigger>
                <SelectContent>
                  {pendingOrders.map(order => (
                    <SelectItem key={order.id} value={order.id.toString()}>
                      {order.customerName} - {DataManager.formatCurrency(order.pending)} pending
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paymentAmount">Payment Amount *</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="paymentDate">Payment Date *</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="paymentMode">Payment Mode *</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="paymentNotes">Notes (Optional)</Label>
              <Textarea
                id="paymentNotes"
                rows={2}
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// 🔮 FORECAST CONTENT COMPONENT
// ==========================================

function ForecastContent() {
  const orders = DataManager.getOrders();
  const materials = DataManager.getMaterials();
  
  // Get upcoming orders (next 7 days)
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  
  const upcomingOrders = orders.filter(order => {
    const deliveryDate = new Date(order.deliveryDate);
    return deliveryDate >= today && deliveryDate <= nextWeek;
  });

  // Calculate total requirements for upcoming orders
  let totalUpcomingWeight = 0;
  upcomingOrders.forEach(order => {
    totalUpcomingWeight += order.totalWeight;
  });

  const requirements = BusinessCalculator.calculateMaterialRequirements(totalUpcomingWeight);
  const expectedRevenue = upcomingOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800">🔮 Business Forecast</h2>

      {/* Upcoming Orders Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-hover">
          <CardContent className="p-6 text-center">
            <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-600">Upcoming Orders</h3>
            <p className="text-2xl font-bold text-blue-600">{upcomingOrders.length}</p>
            <p className="text-xs text-gray-500 mt-1">Next 7 days</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6 text-center">
            <Weight className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-600">Total Production</h3>
            <p className="text-2xl font-bold text-green-600">{totalUpcomingWeight}g</p>
            <p className="text-xs text-gray-500 mt-1">Required</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6 text-center">
            <DollarSign className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-600">Expected Revenue</h3>
            <p className="text-2xl font-bold text-purple-600">
              {DataManager.formatCurrency(expectedRevenue)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Next 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Material Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Material Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(requirements).map(([materialName, quantity]) => {
              if (materialName === 'gasMinutes') {
                const cylinders = Math.ceil(quantity / 300); // Assuming 300 minutes per cylinder
                const cost = cylinders * 800; // ₹800 per cylinder
                return (
                  <Card key={materialName}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-800">Gas</h4>
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          🔥
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Required:</span>
                          <span className="font-medium">{quantity} minutes</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cylinders:</span>
                          <span className="font-medium">{cylinders}</span>
                        </div>
                        <div className="flex justify-between text-primary font-semibold">
                          <span>Cost:</span>
                          <span>{DataManager.formatCurrency(cost)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              } else {
                const material = materials.find(m => m.name.toLowerCase() === materialName.toLowerCase());
                const currentStock = material ? material.stock : 0;
                const shortfall = Math.max(0, quantity - currentStock);
                const cost = material ? shortfall * material.pricePerUnit : 0;
                
                return (
                  <Card key={materialName}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-800">
                          {materialName.charAt(0).toUpperCase() + materialName.slice(1)}
                        </h4>
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          📦
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Required:</span>
                          <span className="font-medium">
                            {quantity.toFixed(2)} {material?.unit || 'units'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>In Stock:</span>
                          <span className="font-medium">
                            {currentStock} {material?.unit || 'units'}
                          </span>
                        </div>
                        <div className={`flex justify-between ${shortfall > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          <span>{shortfall > 0 ? 'Need to Buy:' : 'Surplus:'}</span>
                          <span className="font-medium">
                            {shortfall > 0 ? shortfall.toFixed(2) : (currentStock - quantity).toFixed(2)} {material?.unit || 'units'}
                          </span>
                        </div>
                        {shortfall > 0 && (
                          <div className="flex justify-between text-primary font-semibold border-t pt-2">
                            <span>Cost:</span>
                            <span>{DataManager.formatCurrency(cost)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              }
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Orders Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Orders Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingOrders.length > 0 ? upcomingOrders.map(order => {
              const deliveryDate = new Date(order.deliveryDate);
              const daysUntil = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                      {daysUntil}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{order.customerName}</h4>
                      <p className="text-sm text-gray-600">{DataManager.formatDate(order.deliveryDate)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{order.totalWeight}g</p>
                    <p className="text-sm text-green-600">{DataManager.formatCurrency(order.totalAmount)}</p>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">No upcoming orders in the next 7 days</p>
                <p className="text-sm">Consider reaching out to customers for new orders!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Business Insights */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">💡 Business Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Production Planning:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Schedule production {Math.ceil(totalUpcomingWeight / 5000)} days before delivery</li>
                <li>• Consider batch optimization for efficiency</li>
                <li>• Maintain 10% extra stock for contingency</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Inventory Management:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Order materials 2-3 days in advance</li>
                <li>• Check for bulk purchase discounts</li>
                <li>• Monitor expiry dates for perishables</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
