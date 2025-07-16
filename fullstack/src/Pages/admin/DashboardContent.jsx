import React, { useState, useEffect } from 'react';
import { 
    LineChart, Line, AreaChart, Area, BarChart, Bar, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
    ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
    TrendingUp, DollarSign, Users, ShoppingBag, 
    Calendar, Filter, Download, Eye, Star, AlertCircle,
    RefreshCw
} from 'lucide-react';
import { 
    getDashboardStats, 
    getRevenueChart, 
    getShopsPerformance, 
    getRecentBookings, 
    getCommissionReport,
    payShopCommission,
    exportData,
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

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'];

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const [statsRes, chartRes, shopsRes, bookingsRes, commissionRes] = await Promise.all([
                getDashboardStats(dateRange),
                getRevenueChart(chartType),
                getShopsPerformance(dateRange),
                getRecentBookings(10),
                getCommissionReport(dateRange)
            ]);
            console.log(statsRes.data)
            setDashboardData(statsRes.data);
            setRevenueChart(chartRes.data.data || []);
            setShopsPerformance(shopsRes.data.shops || []);
            setRecentBookings(bookingsRes.data.recent_bookings || []);
            setCommissionReport(commissionRes.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError(error.message || 'Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handlePayCommission = async (shopId, amount) => {
        try {
            await payShopCommission(shopId, amount);
            alert('Payment processed successfully!');
            // Refresh data after payment
            fetchDashboardData();
        } catch (error) {
            console.error('Payment failed:', error);
            alert(`Payment failed: ${error.message || 'Unknown error'}`);
        }
    };

    const handleExport = async (exportType) => {
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
        } catch (error) {
            console.error('Export failed:', error);
            alert(`Export failed: ${error.message || 'Unknown error'}`);
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

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
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
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
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
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {recentBookings.length > 0 ? recentBookings.map((booking) => (
                                            <tr key={booking.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{booking.user_name}</div>
                                                        <div className="text-sm text-gray-500">{booking.user_email}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {booking.shop_name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatDate(booking.appointment_date)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {formatCurrency(booking.total_amount)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                                    {formatCurrency(booking.admin_commission)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                        booking.booking_status === 'completed' 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : booking.booking_status === 'confirmed'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : booking.booking_status === 'cancelled'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {booking.booking_status}
                                                    </span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                                    No recent bookings found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Shops Performance Table */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">Shops Performance</h2>
                                <button 
                                    onClick={() => handleExport('shops')}
                                    className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Export</span>
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop Earnings</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                                            {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion</th> */}
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
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div>
                                                        <div>{shop.total_bookings} Completed</div>
                                                        {/* <div className="text-xs text-gray-500">{shop.completed_bookings} completed</div> */}
                                                    </div>
                                                </td>
                                                {/* <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div 
                                                                className="bg-green-600 h-2 rounded-full" 
                                                                style={{ width: `${Math.min(shop.completion_rate || 0, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="ml-2 text-sm text-gray-600">{shop.completion_rate || 0}%</span>
                                                    </div>
                                                </td> */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                                        <span className="ml-1 text-sm text-gray-900">{shop.average_rating || 0}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handlePayCommission(shop.id, shop.shop_earnings)}
                                                        className="text-green-600 hover:text-green-900 px-2 py-1 rounded"
                                                    >
                                                        Pay
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                                                    No shops performance data available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Commission Summary */}
                        {/* {commissionReport && (
                            <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Commission Summary</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-blue-600">Total Commission Earned</h3>
                                        <p className="text-2xl font-bold text-blue-900">{formatCurrency(commissionReport.total_commission_earned)}</p>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-green-600">Commission Paid</h3>
                                        <p className="text-2xl font-bold text-green-900">{formatCurrency(commissionReport.commission_paid)}</p>
                                    </div>
                                    <div className="bg-yellow-50 p-4 rounded-lg">
                                        <h3 className="text-sm font-medium text-yellow-600">Pending Commission</h3>
                                        <p className="text-2xl font-bold text-yellow-900">{formatCurrency(commissionReport.pending_commission)}</p>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-medium text-gray-900 mb-3">Commission Breakdown</h3>
                                    <div className="space-y-3">
                                        {commissionReport.shop_commissions?.map((shop) => (
                                            <div key={shop.shop_id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                                                <div>
                                                    <p className="font-medium text-gray-900">{shop.shop_name}</p>
                                                    <p className="text-sm text-gray-600">{shop.total_bookings} bookings</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-gray-900">{formatCurrency(shop.commission_amount)}</p>
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                        shop.status === 'paid' 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {shop.status}
                                                    </span>
                                                </div>
                                            </div>
                                        )) || <p className="text-gray-500">No commission data available</p>}
                                    </div>
                                </div>
                            </div>
                        )} */}
                    </>
                )}
            </div>
        </div>
    );
};

export default DashboardContent;