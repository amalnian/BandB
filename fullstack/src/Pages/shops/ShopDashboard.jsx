import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  DollarSign, 
  Users, 
  ShoppingBag,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Download,
  Filter,
  Eye,
  Star,
  Clock,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RechartsPieChart, Cell,Pie } from 'recharts';

// Import your API functions
import { 
  getSalesChart, 
  getMostBookedServices, 
  getRevenueStats, 
  getBookingStats,
  getServicePerformance,
  getPaymentMethodStats,
  exportSalesReport
} from '@/endpoints/ShopAPI';

const ShopSalesDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7');
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  // State for real data
  const [salesData, setSalesData] = useState([]);
  const [mostBookedServices, setMostBookedServices] = useState([]);
  const [revenueStats, setRevenueStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    avgOrderValue: 0,
    completionRate: 0,
    growthRate: 0,
    pendingBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0
  });
  const [servicePerformance, setServicePerformance] = useState([]);
  const [paymentStats, setPaymentStats] = useState([]);
  const [error, setError] = useState(null);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [
        salesResponse,
        servicesResponse,
        statsResponse,
        servicePerformanceResponse,
        paymentStatsResponse
      ] = await Promise.all([
        getSalesChart(selectedPeriod),
        getMostBookedServices(selectedPeriod),
        getRevenueStats(selectedPeriod),
        getServicePerformance(selectedPeriod),
        getPaymentMethodStats(selectedPeriod)
      ]);

      setSalesData(salesResponse.data.sales_data || []);
      setMostBookedServices(servicesResponse.data.services || []);
      setRevenueStats(statsResponse.data || {});
      setServicePerformance(servicePerformanceResponse.data.services || []);
      setPaymentStats(paymentStatsResponse.data.payment_methods || []);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on component mount and when period changes
  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  // Export sales report
  const handleExportReport = async (format = 'pdf') => {
    try {
      const response = await exportSalesReport(selectedPeriod, format);
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-report-${selectedPeriod}days.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting report:', err);
    }
  };

  // Colors for charts
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sales dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales Dashboard</h1>
            <p className="text-gray-600 mt-2">Track your shop's performance and revenue</p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            {/* Period Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
            </div>

            {/* Export Button */}
            <div className="relative">
              <button
                onClick={() => handleExportReport('pdf')}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(revenueStats.totalRevenue || 0)}
                </h3>
                <p className={`text-xs mt-1 ${revenueStats.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {revenueStats.growthRate >= 0 ? '↑' : '↓'} {Math.abs(revenueStats.growthRate || 0)}% from last period
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full text-green-600">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {revenueStats.totalBookings || 0}
                </h3>
                <p className="text-xs text-blue-600 mt-1">
                  {revenueStats.completedBookings || 0} completed
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                <CalendarCheck className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Order Value</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(revenueStats.avgOrderValue || 0)}
                </h3>
                <p className="text-xs text-purple-600 mt-1">
                  Per booking average
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {revenueStats.completionRate || 0}%
                </h3>
                <p className="text-xs text-amber-600 mt-1">
                  {revenueStats.pendingBookings || 0} pending
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-full text-amber-600">
                <Star className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Chart */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Sales Trend</h3>
              <BarChart3 className="w-5 h-5 text-gray-500" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    fontSize={12}
                  />
                  <YAxis 
                    tickFormatter={(value) => `₹${value}`}
                    fontSize={12}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(value) : value,
                      name === 'revenue' ? 'Revenue' : 'Bookings'
                    ]}
                    labelFormatter={(label) => `Date: ${formatDate(label)}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Most Booked Services */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Most Booked Services</h3>
              <ShoppingBag className="w-5 h-5 text-gray-500" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mostBookedServices}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    formatter={(value, name) => [
                      value,
                      name === 'bookings' ? 'Bookings' : 'Revenue'
                    ]}
                  />
                  <Bar dataKey="bookings" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Service Performance Table */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Service Performance</h3>
            <Eye className="w-5 h-5 text-gray-500" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Service</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Bookings</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Revenue</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Avg Price</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Growth</th>
                </tr>
              </thead>
              <tbody>
                {servicePerformance.map((service, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-900">{service.name}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{service.bookings}</td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {formatCurrency(service.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {formatCurrency(service.avgPrice)}
                    </td>
                    <td className={`py-3 px-4 text-right ${service.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {service.growth >= 0 ? '↑' : '↓'} {Math.abs(service.growth)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Methods Chart */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
            <PieChart className="w-5 h-5 text-gray-500" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={paymentStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopSalesDashboard;