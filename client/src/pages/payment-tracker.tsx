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

interface IncomeEntry {
  id: string;
  customerName: string;
  amount: number;
  date: string;
  orderSize?: string;
  remarks?: string;
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

// ==========================================
// 🗄️ DATA MANAGER CLASS (localStorage based)
// ==========================================

class PaymentDataManager {
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
  const [activeTab, setActiveTab] = useState('intake');
  const [refreshKey, setRefreshKey] = useState(0);

  // Income form states
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [incomeForm, setIncomeForm] = useState({
    customerName: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    orderSize: '',
    remarks: ''
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
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);

  // Load data on mount and refresh
  useEffect(() => {
    setIncomeEntries(PaymentDataManager.getIncomeEntries());
    setExpenseEntries(PaymentDataManager.getExpenseEntries());
  }, [refreshKey]);

  // Calculate totals
  const totalIncome = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalExpense = expenseEntries
    .filter(entry => !entry.isExtra)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const extraExpense = expenseEntries
    .filter(entry => entry.isExtra)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const profit = totalIncome - totalExpense;

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
      remarks: incomeForm.remarks.trim() || undefined
    });

    // Reset form
    setIncomeForm({
      customerName: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      orderSize: '',
      remarks: ''
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
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">💰 Payment Tracker</h1>
          <p className="text-gray-600">Simple income and expense tracking for your business</p>
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="intake" className="text-green-700">
              💰 Income (IN-TAKE)
            </TabsTrigger>
            <TabsTrigger value="outtake" className="text-red-700">
              💸 Expenses (OUT-TAKE)
            </TabsTrigger>
          </TabsList>

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
                    {incomeEntries.slice().reverse().map(entry => (
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
                    {incomeEntries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No income entries yet. Add your first income entry!
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
                    {expenseEntries.slice().reverse().map(entry => (
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
                    {expenseEntries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No expense entries yet. Add your first expense entry!
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}