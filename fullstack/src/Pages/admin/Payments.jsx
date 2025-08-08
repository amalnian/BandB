import React, { useState, useEffect } from 'react';
import toast, { Toaster } from "react-hot-toast"; // Add this import
import { getShopPayments } from '@/endpoints/AdminAPI'; // Update path as needed

const ShopPaymentsList = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        shop_id: '',
        payment_method: '',
        start_date: '',
        end_date: ''
    });
    const [totalCount, setTotalCount] = useState(0);
    const [totalAmount, setTotalAmount] = useState(0);
    const [downloading, setDownloading] = useState(false);

    const fetchPayments = async () => {
        const loadingToast = toast.loading("Loading payments..."); // Add loading toast
        
        try {
            setLoading(true);
            const response = await getShopPayments(filters);
            setPayments(response.data.payments);
            setTotalCount(response.data.total_count);
            
            // Calculate total amount
            const total = response.data.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
            setTotalAmount(total);
            
            setError(null);
            
            // Show success toast
            toast.dismiss(loadingToast);
            toast.success(`Loaded ${response.data.payments.length} payments successfully!`);
            
        } catch (err) {
            console.error('Error fetching payments:', err);
            const errorMessage = 'Failed to load payments. Please try again.';
            setError(errorMessage);
            
            // Show error toast
            toast.dismiss(loadingToast);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFilterSubmit = () => {
        toast.promise(
            fetchPayments(),
            {
                loading: 'Applying filters...',
                success: 'Filters applied successfully!',
                error: 'Failed to apply filters'
            }
        );
    };

    const handleClearFilters = () => {
        setFilters({
            shop_id: '',
            payment_method: '',
            start_date: '',
            end_date: ''
        });
        
        // Show toast for clearing filters
        toast.promise(
            (async () => {
                try {
                    setLoading(true);
                    const response = await getShopPayments({});
                    setPayments(response.data.payments);
                    setTotalCount(response.data.total_count);
                    
                    // Calculate total amount
                    const total = response.data.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
                    setTotalAmount(total);
                } catch (err) {
                    setError('Failed to load payments. Please try again.');
                    throw err;
                } finally {
                    setLoading(false);
                }
            })(),
            {
                loading: 'Clearing filters...',
                success: 'Filters cleared successfully!',
                error: 'Failed to clear filters'
            }
        );
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'INR' // Change to your currency
        }).format(amount);
    };

    // CSV Download functionality
    const convertToCSV = (data) => {
        const headers = [
            'Shop Name',
            'Shop ID',
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
                `"${payment.shop_name || `Shop ${payment.shop_id}` || ''}"`,
                `"${payment.shop_id || ''}"`,
                `"${payment.amount || 0}"`,
                `"${payment.payment_method?.replace('_', ' ')?.toUpperCase() || 'N/A'}"`,
                `"${payment.transaction_reference || '-'}"`,
                `"${payment.payment_date || '-'}"`,
                `"${payment.paid_by || '-'}"`,
                `"${(payment.notes || '-').replace(/"/g, '""')}"` // Escape quotes in notes
            ].join(','))
        ].join('\n');

        return csvContent;
    };

    const downloadCSV = async () => {
        if (payments.length === 0) {
            toast.error('No payments data to download'); // Replace alert with toast
            return;
        }

        // Show toast promise for download process
        toast.promise(
            (async () => {
                setDownloading(true);
                
                // Create CSV content
                const csvContent = convertToCSV(payments);
                
                // Create and download file
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                
                if (link.download !== undefined) {
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    
                    // Generate filename with current date and filter info
                    const currentDate = new Date().toISOString().split('T')[0];
                    let filename = `Shop_Payments_${currentDate}`;
                    
                    // Add filter info to filename if filters are applied
                    if (filters.shop_id) filename += `_Shop${filters.shop_id}`;
                    if (filters.payment_method) filename += `_${filters.payment_method}`;
                    if (filters.start_date) filename += `_from${filters.start_date}`;
                    if (filters.end_date) filename += `_to${filters.end_date}`;
                    
                    filename += '.csv';
                    link.setAttribute('download', filename);
                    
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // Clean up the URL object
                    URL.revokeObjectURL(url);
                }
            })(),
            {
                loading: 'Preparing download...',
                success: 'CSV file downloaded successfully!',
                error: 'Failed to download CSV file'
            }
        ).finally(() => {
            setDownloading(false);
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                    <div className="mt-4 text-gray-600">Loading shop payments...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            {/* Add Toaster component */}
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
                }}
            />
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white shadow-xl rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Shop Commission Payments
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
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Shop ID
                                    </label>
                                    <input
                                        type="text"
                                        name="shop_id"
                                        value={filters.shop_id}
                                        onChange={handleFilterChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter shop ID"
                                    />
                                </div>
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
                                        Shop
                                    </th>
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
                                        <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                            {error ? 'Failed to load payments' : 'No payments found'}
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {payment.shop_name || `Shop ${payment.shop_id}`}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        ID: {payment.shop_id}
                                                    </div>
                                                </div>
                                            </td>
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
                                                {payment.payment_date || '-'}
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