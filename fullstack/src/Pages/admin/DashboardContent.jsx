import React, { useState, useEffect } from 'react';
import { 
    LineChart, Line, AreaChart, Area, BarChart, Bar, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
    ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
    TrendingUp, DollarSign, Users, ShoppingBag, 
    Calendar, Filter, Download, Eye, Star, AlertCircle,
    RefreshCw, X, CreditCard, FileText, Check
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { 
    getDashboardStats, 
    getRevenueChart, 
    getShopsPerformance, 
    getRecentBookings, 
    getCommissionReport,
    exportData,
    recordShopPayment
} from '@/endpoints/AdminAPI';

const DashboardContent = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [revenueChart, setRevenueChart] = useState([]);
    const [shopsPerformance, setShopsPerformance] = useState([]);
    const [recentBookings, setRecentBookings] = useState([]);
    const [commissionReport, setCommissionReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [chartType, setChartType] = useState('daily');
    const [dateRange, setDateRange] = useState({
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
    });

    // Payment Modal State
    const [paymentModal, setPaymentModal] = useState({
        isOpen: false,
        shop: null,
        amount: 0
    });
    const [paymentForm, setPaymentForm] = useState({
        payment_method: 'bank_transfer',
        transaction_reference: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [paymentLoading, setPaymentLoading] = useState(false);

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'];

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Show loading toast for data refresh
            const loadingToast = toast.loading("Refreshing dashboard data...");
            
            const [statsRes, chartRes, shopsRes, bookingsRes, commissionRes] = await Promise.all([
                getDashboardStats(dateRange),
                getRevenueChart(chartType),
                getShopsPerformance(dateRange),
                getRecentBookings(10),
                getCommissionReport(dateRange)
            ]);
            
            console.log(statsRes);
            setDashboardData(statsRes.data);
            setRevenueChart(chartRes.data.data || []);
            setShopsPerformance(shopsRes.data.shops || []);
            setRecentBookings(bookingsRes.data.recent_bookings || []);
            setCommissionReport(commissionRes.data);
            
            // Dismiss loading toast and show success
            toast.dismiss(loadingToast);
            toast.success("Dashboard data updated successfully!", {
                duration: 2000,
            });
            
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch dashboard data';
            setError(errorMessage);
            
            // Show error toast
            toast.error(errorMessage, {
                duration: 4000,
            });
        } finally {
            setLoading(false);
        }
    };

    const openPaymentModal = (shop, amount) => {
        setPaymentModal({
            isOpen: true,
            shop,
            amount
        });
        setPaymentForm({
            payment_method: 'bank_transfer',
            transaction_reference: '',
            payment_date: new Date().toISOString().split('T')[0],
            notes: ''
        });
    };

    const closePaymentModal = () => {
        setPaymentModal({
            isOpen: false,
            shop: null,
            amount: 0
        });
        setPaymentForm({
            payment_method: 'bank_transfer',
            transaction_reference: '',
            payment_date: new Date().toISOString().split('T')[0],
            notes: ''
        });
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        setPaymentLoading(true);

        // Show loading toast
        const loadingToast = toast.loading("Recording payment...");

        try {
            const paymentData = {
                shop_id: paymentModal.shop.id,
                amount: paymentModal.amount,
                ...paymentForm
            };

            await recordShopPayment(paymentData);
            
            // Dismiss loading toast and show success
            toast.dismiss(loadingToast);
            toast.success(`Payment of ${formatCurrency(paymentModal.amount)} recorded successfully for ${paymentModal.shop.name}!`, {
                duration: 4000,
            });
            
            closePaymentModal();
            fetchDashboardData(); // Refresh data
        } catch (error) {
            console.error('Payment recording failed:', error);
            
            // Dismiss loading toast and show error
            toast.dismiss(loadingToast);
            
            const errorMessage = error.response?.data?.error || 
                               error.response?.data?.message || 
                               error.message || 
                               'Payment recording failed';
            
            toast.error(`Payment recording failed: ${errorMessage}`, {
                duration: 5000,
            });
        } finally {
            setPaymentLoading(false);
        }
    };

    const handleExport = async (exportType) => {
        // Show loading toast
        const loadingToast = toast.loading(`Exporting ${exportType} data...`);
        
        try {
            const response = await exportData(exportType);
            
            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${exportType}_export.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            // Dismiss loading toast and show success
            toast.dismiss(loadingToast);
            toast.success(`${exportType} data exported successfully!`, {
                duration: 3000,
            });
            
        } catch (error) {
            console.error('Export failed:', error);
            
            // Dismiss loading toast and show error
            toast.dismiss(loadingToast);
            
            const errorMessage = error.response?.data?.message || 
                               error.message || 
                               'Export failed';
            
            toast.error(`Export failed: ${errorMessage}`, {
                duration: 4000,
            });
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [dateRange, chartType]);

    const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                </div>
                <div className="p-3 rounded-full" style={{ backgroundColor: color + '20' }}>
                    <Icon className="w-6 h-6" style={{ color }} />
                </div>
            </div>
        </div>
    );

    const ErrorAlert = ({ message, onRetry }) => (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800">Error Loading Dashboard</h3>
                    <p className="text-sm text-red-700 mt-1">{message}</p>
                </div>
                <button 
                    onClick={onRetry}
                    className="ml-4 px-3 py-1 bg-red-100 text-red-800 text-sm rounded hover:bg-red-200"
                >
                    Retry
                </button>
            </div>
        </div>
    );

    const LoadingSpinner = () => (
        <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
    );

    const formatCurrency = (amount) => {
        const numAmount = parseFloat(amount) || 0;
        return `₹${numAmount.toLocaleString('en-IN')}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN');
    };

    // Payment Modal Component
    const PaymentModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
                    <button
                        onClick={closePaymentModal}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Shop</p>
                    <p className="font-medium text-gray-900">{paymentModal.shop?.name}</p>
                    <p className="text-sm text-gray-600 mt-1">Amount</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(paymentModal.amount)}</p>
                </div>

                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Payment Method *
                        </label>
                        <select
                            value={paymentForm.payment_method}
                            onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="upi">UPI</option>
                            <option value="cash">Cash</option>
                            <option value="cheque">Cheque</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Transaction Reference
                        </label>
                        <input
                            type="text"
                            value={paymentForm.transaction_reference}
                            onChange={(e) => setPaymentForm({...paymentForm, transaction_reference: e.target.value})}
                            placeholder="UTR, Transaction ID, Cheque No., etc."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Payment Date *
                        </label>
                        <input
                            type="date"
                            value={paymentForm.payment_date}
                            onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes
                        </label>
                        <textarea
                            value={paymentForm.notes}
                            onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                            placeholder="Any additional notes about the payment..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={closePaymentModal}
                            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={paymentLoading}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {paymentLoading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Record Payment
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Toast container */}
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                    },
                    success: {
                        iconTheme: {
                            primary: '#10b981',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#fff',
                        },
                    },
                    loading: {
                        iconTheme: {
                            primary: '#3b82f6',
                            secondary: '#fff',
                        },
                    },
                }}
            />

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
                            <p className="text-gray-600">Manage your barbershop business analytics and revenue</p>
                        </div>
                        <button 
                            onClick={fetchDashboardData}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <ErrorAlert message={error} onRetry={fetchDashboardData} />
                )}

                {/* Date Range Filter */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-600">Date Range:</span>
                        </div>
                        <input
                            type="date"
                            value={dateRange.start_date}
                            onChange={(e) => setDateRange({...dateRange, start_date: e.target.value})}
                            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                            type="date"
                            value={dateRange.end_date}
                            onChange={(e) => setDateRange({...dateRange, end_date: e.target.value})}
                            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                            value={chartType}
                            onChange={(e) => setChartType(e.target.value)}
                            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <>
                        {/* Stats Cards */}
                        {dashboardData && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <StatCard
                                    title="Total Revenue"
                                    value={formatCurrency(dashboardData.financial_stats?.total_revenue || 0)}
                                    icon={DollarSign}
                                    color="#10b981"
                                    subtitle="All bookings"
                                />
                                <StatCard
                                    title="Admin Commission (10%)"
                                    value={formatCurrency(dashboardData.financial_stats?.admin_commission || 0)}
                                    icon={TrendingUp}
                                    color="#3b82f6"
                                    subtitle="Your earnings"
                                />
                                <StatCard
                                    title="Shop Earnings"
                                    value={formatCurrency(dashboardData.financial_stats?.shop_earnings || 0)}
                                    icon={ShoppingBag}
                                    color="#f59e0b"
                                    subtitle="To be paid to shops"
                                />
                                <StatCard
                                    title="Total Bookings"
                                    value={dashboardData.booking_stats?.total_bookings || 0}
                                    icon={Users}
                                    color="#8b5cf6"
                                    subtitle={`${dashboardData.booking_stats?.completion_rate || 0}% completion rate`}
                                />
                            </div>
                        )}

                        {/* Revenue Chart */}
                        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue Overview</h2>
                            <ResponsiveContainer width="100%" height={400}>
                                <AreaChart data={revenueChart}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                                    <Legend />
                                    <Area type="monotone" dataKey="total_revenue" stackId="1" stroke="#10b981" fill="#10b981" name="Total Revenue" />
                                    <Area type="monotone" dataKey="admin_commission" stackId="2" stroke="#3b82f6" fill="#3b82f6" name="Admin Commission" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            {/* Top Performing Shops */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Performing Shops</h2>
                                <div className="space-y-4">
                                    {dashboardData?.general_stats?.top_shops?.slice(0, 5).map((shop, index) => (
                                        <div key={shop.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-gray-900">{shop.name}</h3>
                                                    <p className="text-sm text-gray-600">{shop.total_bookings} bookings</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-gray-900">{formatCurrency(shop.total_revenue)}</p>
                                                <p className="text-sm text-blue-600">Commission: {formatCurrency(shop.admin_commission)}</p>
                                            </div>
                                        </div>
                                    )) || <p className="text-gray-500">No data available</p>}
                                </div>
                            </div>

                            {/* Booking Status Distribution */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Status Distribution</h2>
                                {dashboardData?.booking_stats ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Completed', value: dashboardData.booking_stats.completed_bookings },
                                                    { name: 'Cancelled', value: dashboardData.booking_stats.cancelled_bookings },
                                                    { name: 'Other', value: dashboardData.booking_stats.total_bookings - dashboardData.booking_stats.completed_bookings - dashboardData.booking_stats.cancelled_bookings }
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {[
                                                    { name: 'Completed', value: dashboardData.booking_stats.completed_bookings },
                                                    { name: 'Cancelled', value: dashboardData.booking_stats.cancelled_bookings },
                                                    { name: 'Other', value: dashboardData.booking_stats.total_bookings - dashboardData.booking_stats.completed_bookings - dashboardData.booking_stats.cancelled_bookings }
                                                ].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-64">
                                        <p className="text-gray-500">No booking data available</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Bookings */}
                        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Bookings</h2>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop Earnings</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining Earnings</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {shopsPerformance.length > 0 ? shopsPerformance.map((shop) => (
                                            <tr key={shop.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{shop.name}</div>
                                                        <div className="text-sm text-gray-500">{shop.location}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {shop.owner_name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {formatCurrency(shop.total_revenue)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                                    {formatCurrency(shop.admin_commission)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                                    {formatCurrency(shop.shop_earnings)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                                    {formatCurrency(shop.remaining_earnings)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {shop.total_bookings}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <Star className="w-4 h-4 text-yellow-500 mr-1" />
                                                        <span className="text-sm text-gray-900">
                                                            {shop.average_rating ? parseFloat(shop.average_rating).toFixed(1) : 'N/A'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div className="flex space-x-2">
                                                        <button 
                                                            onClick={() => window.open(`/shops/${shop.id}`, '_blank')}
                                                            className="text-blue-600 hover:text-blue-800 p-1 rounded"
                                                            title="View Shop"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        {shop.shop_earnings > 0 && (
                                                            <button 
                                                                onClick={() => openPaymentModal(shop, shop.remaining_earnings)}
                                                                className="text-green-600 hover:text-green-800 p-1 rounded"
                                                                title="Record Payment"
                                                            >
                                                                <CreditCard className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                                                    No shops data available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Commission Report */}
                        {commissionReport && (
                            <div className="bg-white rounded-lg shadow-md p-6 mt-8">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-semibold text-gray-900">Commission Report</h2>
                                    <button 
                                        onClick={() => handleExport('commission')}
                                        className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>Export Report</span>
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-blue-800">Total Commission Earned</h3>
                                        <p className="text-2xl font-bold text-blue-900">
                                            {formatCurrency(commissionReport.total_commission || 0)}
                                        </p>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-green-800">Commission Paid</h3>
                                        <p className="text-2xl font-bold text-green-900">
                                            {formatCurrency(commissionReport.commission_paid || 0)}
                                        </p>
                                    </div>
                                    <div className="bg-yellow-50 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-yellow-800">Pending Commission</h3>
                                        <p className="text-2xl font-bold text-yellow-900">
                                            {formatCurrency(commissionReport.pending_commission || 0)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Payment Modal */}
                {paymentModal.isOpen && <PaymentModal />}
            </div>
        </div>
    );
};

export default DashboardContent;