import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWalletBalance, getWalletTransactions, addMoneyToWallet } from '@/endpoints/APIs'
import { useRazorpay } from '@/Pages/user/Hooks/useRazorpay'
import { toast } from 'react-hot-toast'
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, RefreshCw, Calendar, Filter, X } from 'lucide-react'

const WalletManagement = () => {
  const [walletBalance, setWalletBalance] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [addMoneyLoading, setAddMoneyLoading] = useState(false)
  const [showAddMoney, setShowAddMoney] = useState(false)
  const [addAmount, setAddAmount] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterType, setFilterType] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  
  const navigate = useNavigate()
  const { initiatePayment, isLoading: razorpayLoading } = useRazorpay()

  useEffect(() => {
    fetchWalletData()
    fetchTransactions()
  }, [currentPage, filterType])

  const fetchWalletData = async () => {
    try {
      setLoading(true)
      const response = await getWalletBalance()
      if (response.success) {
        setWalletBalance(response.data.balance)
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error)
      toast.error('Failed to fetch wallet balance')
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async () => {
    try {
      setTransactionsLoading(true)
      const params = {
        page: currentPage,
        limit: 20,
        ...(filterType !== 'all' && { type: filterType })
      }
      
      const response = await getWalletTransactions(params)
      if (response.success) {
        setTransactions(response.data.transactions)
        setTotalPages(response.data.pagination.total_pages)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast.error('Failed to fetch transactions')
    } finally {
      setTransactionsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchWalletData(), fetchTransactions()])
    setRefreshing(false)
    toast.success('Wallet data refreshed')
  }

//   const handleAddMoney = async () => {
//     if (!addAmount || parseFloat(addAmount) <= 0) {
//       toast.error('Please enter a valid amount')
//       return
//     }

//     const amount = parseFloat(addAmount)
//     if (amount < 10) {
//       toast.error('Minimum amount is ₹10')
//       return
//     }
//     if (amount > 50000) {
//       toast.error('Maximum amount is ₹50,000')
//       return
//     }

//     // Use Razorpay for adding money
//     const paymentData = {
//       amount: amount,
//       businessName: 'Your Business Name',
//       description: `Add ₹${amount} to wallet`,
//       customerName: '', // Add customer details if available
//       customerEmail: '',
//       customerPhone: '',
//       themeColor: '#16a34a'
//     }

//     initiatePayment(
//       paymentData,
//       // Success callback
//       async (response) => {
//         try {
//           setAddMoneyLoading(true)
//           const walletResponse = await addMoneyToWallet({
//             amount: amount,
//             description: 'Money added via Razorpay',
//             payment_method: 'razorpay',
//             payment_id: response.razorpay_payment_id
//           })
          
//           if (walletResponse.success) {
//             toast.success(`₹${amount} added to wallet successfully!`)
//             setWalletBalance(walletResponse.data.new_balance)
//             setAddAmount('')
//             setShowAddMoney(false)
//             fetchTransactions() // Refresh transactions
//           }
//         } catch (error) {
//           console.error('Error adding money to wallet:', error)
//           toast.error('Failed to add money to wallet')
//         } finally {
//           setAddMoneyLoading(false)
//         }
//       },
//       // Failure callback
//       (error) => {
//         console.error('Payment failed:', error)
//         toast.error(`Payment failed: ${error.message}`)
//       }
//     )
//   }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (type) => {
    return type === 'credit' ? (
      <ArrowDownLeft className="w-4 h-4 text-green-600" />
    ) : (
      <ArrowUpRight className="w-4 h-4 text-red-600" />
    )
  }

  const getTransactionColor = (type) => {
    return type === 'credit' ? 'text-green-600' : 'text-red-600'
  }

  const predefinedAmounts = [100, 500, 1000, 2000, 5000]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading wallet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
          <div className="flex items-center">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 mr-4 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-700">
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <h1 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center">
              <Wallet className="w-6 h-6 mr-2" />
              My Wallet
            </h1>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-6">
          {/* Wallet Balance Card */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Available Balance</p>
                <h2 className="text-3xl font-bold mt-1">₹{walletBalance.toFixed(2)}</h2>
              </div>
              <Wallet className="w-12 h-12 text-blue-200" />
            </div>
            
            {/* <button
              onClick={() => setShowAddMoney(true)}
              className="mt-4 bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Money
            </button> */}
          </div>

          {/* Filter and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Transactions</option>
                <option value="credit">Money Added</option>
                <option value="debit">Money Spent</option>
              </select>
            </div>
          </div>

          {/* Transactions */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Transaction History
              </h3>
            </div>

            {transactionsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center">
                <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No transactions found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          {getTransactionIcon(transaction.transaction_type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(transaction.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${getTransactionColor(transaction.transaction_type)}`}>
                          {transaction.transaction_type === 'credit' ? '+' : '-'}₹{transaction.amount}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Money Modal */}
        {showAddMoney && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Add Money to Wallet</h3>
                <button
                  onClick={() => setShowAddMoney(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Predefined amounts */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Quick amounts</p>
                <div className="grid grid-cols-3 gap-2">
                  {predefinedAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setAddAmount(amount.toString())}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      ₹{amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter amount
                </label>
                <input
                  type="number"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="Enter amount (₹10 - ₹50,000)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="10"
                  max="50000"
                />
              </div>

              {/* Add money button */}
              <button
                onClick={handleAddMoney}
                disabled={addMoneyLoading || razorpayLoading || !addAmount}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {addMoneyLoading || razorpayLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  `Add ₹${addAmount || '0'} to Wallet`
                )}
              </button>

              <p className="text-xs text-gray-500 mt-3 text-center">
                You will be redirected to a secure payment gateway
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WalletManagement