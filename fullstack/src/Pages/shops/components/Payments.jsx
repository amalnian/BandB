import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
// Fix the import path - adjust according to your actual file structure
import { getSpecificShopPayments } from '../../../endpoints/ShopAPI';
// Alternative if you have the @ alias configured:
// import { getSpecificShopPayments } from '@/endpoints/ShopAPI';

const ShopPaymentsList = () => {
    // Option 1: Get shopId from URL parameters
    const { shopId: urlShopId } = useParams();
    
    // Option 2: Get shopId from localStorage if not in URL
    const getShopId = () => {
        if (urlShopId) return urlShopId;
        
        const shopData = localStorage.getItem("shop_data");
        if (shopData) {
            try {
                const parsed = JSON.parse(shopData);
                return parsed.id || parsed.shop_id;
            } catch (error) {
                console.error('Error parsing shop data:', error);
            }
        }
        return null;
    };
    
    const shopId = getShopId();
    
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [shopName, setShopName] = useState('');
    const [filters, setFilters] = useState({
        payment_method: '',
        start_date: '',
        end_date: ''
    });
    const [totalCount, setTotalCount] = useState(0);
    const [totalAmount, setTotalAmount] = useState(0);
    const [downloading, setDownloading] = useState(false);

    const fetchPayments = async () => {
        if (!shopId) {
            setError('Shop ID not available. Please ensure you are logged in properly.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            console.log('Fetching payments for shopId:', shopId);
            
            const apiFilters = {
                ...filters,
                shop_id: parseInt(shopId, 10)
            };
            
            const response = await getSpecificShopPayments(apiFilters);
            console.log('API Response:', response.data);
            
            setPayments(response.data.payments || []);
            setTotalCount(response.data.total_count || 0);
            setTotalAmount(response.data.total_amount || 0);
            
            if (response.data.shop && response.data.shop.name) {
                setShopName(response.data.shop.name);
            } else {
                // Fallback to get shop name from localStorage
                const shopData = localStorage.getItem("shop_data");
                if (shopData) {
                    try {
                        const parsed = JSON.parse(shopData);
                        setShopName(parsed.name || '');
                    } catch (error) {
                        console.error('Error parsing shop data:', error);
                    }
                }
            }
            
            setError(null);
        } catch (err) {
            console.error('Error fetching payments:', err);
            setError(`Failed to load payments: ${err.message || 'Please try again.'}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log('useEffect triggered, shopId:', shopId);
        fetchPayments();
    }, [shopId]); // Only depend on shopId

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFilterSubmit = () => {
        fetchPayments();
    };

    const handleClearFilters = () => {
        setFilters({
            payment_method: '',
            start_date: '',
            end_date: ''
        });
        // Use setTimeout to ensure state is updated before fetching
        setTimeout(() => {
            fetchPayments();
        }, 100);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    // CSV Download functionality
    const convertToCSV = (data) => {
        const headers = [
            'Amount',
            'Payment Method',
            'Transaction Reference',
            'Payment Date',
            'Paid By',
            'Notes'
        ];

        const csvContent = [
            headers.join(','),
            ...data.map(payment => [
                `"${payment.amount || 0}"`,
                `"${payment.payment_method?.replace('_', ' ')?.toUpperCase() || 'N/A'}"`,
                `"${payment.transaction_reference || '-'}"`,
                `"${payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}"`,
                `"${payment.paid_by || '-'}"`,
                `"${(payment.notes || '-').replace(/"/g, '""')}"` // Escape quotes in notes
            ].join(','))
        ].join('\n');

        return csvContent;
    };

    const downloadCSV = async () => {
        if (payments.length === 0) {
            alert('No payments data to download');
            return;
        }

        try {
            setDownloading(true);
            
            // Create CSV content
            const csvContent = convertToCSV(payments);
            
            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                
                // Generate filename with shop name and current date
                const currentDate = new Date().toISOString().split('T')[0];
                const filename = `${shopName || `Shop_${shopId}`}_Payments_${currentDate}.csv`;
                link.setAttribute('download', filename);
                
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up the URL object
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Error downloading CSV:', error);
            alert('Failed to download CSV. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    // Check if shopId is valid
    if (!shopId) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-gray-500 mb-4">Shop ID not available</div>
                    <div className="text-sm text-gray-400">
                        Please ensure you are logged in properly
                    </div>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Refresh Page
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                    <div className="mt-4 text-gray-600">Loading payments for {shopName || `Shop ${shopId}`}...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white shadow-xl rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Commission Payments - {shopName || `Shop ${shopId}`}
                                </h1>
                                <p className="text-gray-600 mt-2">
                                    Total: {totalCount} payments | Total Amount: {formatCurrency(totalAmount)}
                                </p>
                            </div>
                            <button
                                onClick={downloadCSV}
                                disabled={downloading || payments.length === 0}
                                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {downloading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Downloading...
                                    </>
                                ) : (
                                    <>
                                        <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Download
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Filters Section */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Payment Method
                                    </label>
                                    <select
                                        name="payment_method"
                                        value={filters.payment_method}
                                        onChange={handleFilterChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">All Methods</option>
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="check">Check</option>
                                        <option value="online">Online</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        name="start_date"
                                        value={filters.start_date}
                                        onChange={handleFilterChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        name="end_date"
                                        value={filters.end_date}
                                        onChange={handleFilterChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleFilterSubmit}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    Apply Filters
                                </button>
                                <button
                                    onClick={handleClearFilters}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="px-6 py-4 border-l-4 border-red-500 bg-red-50">
                            <p className="text-red-800">{error}</p>
                            <button 
                                onClick={fetchPayments}
                                className="mt-2 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Payments Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Payment Method
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Transaction Ref
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Payment Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Paid By
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Notes
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {payments.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                            {error ? 'Failed to load payments' : 'No payments found for this shop'}
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                                {formatCurrency(payment.amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    {payment.payment_method?.replace('_', ' ')?.toUpperCase() || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {payment.transaction_reference || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {payment.paid_by || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                <div className="max-w-xs truncate" title={payment.notes}>
                                                    {payment.notes || '-'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary Section */}
                    {payments.length > 0 && (
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">
                                    Showing {payments.length} payment{payments.length !== 1 ? 's' : ''}
                                </span>
                                <span className="text-lg font-semibold text-gray-900">
                                    Total Amount: {formatCurrency(totalAmount)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShopPaymentsList;