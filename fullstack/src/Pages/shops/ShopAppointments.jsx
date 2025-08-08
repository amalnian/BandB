import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import toast, { Toaster } from "react-hot-toast"; // Add this import
import { getShopBookings, updateBookingStatus, getBookingStats } from '@/endpoints/APIs';

const AppointmentsContent = () => {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelModal, setCancelModal] = useState({ show: false, bookingId: null });
  const [completionNotes, setCompletionNotes] = useState('');
  const [completeModal, setCompleteModal] = useState({ show: false, bookingId: null });
  const [filters, setFilters] = useState({
    status: 'all',
    date: '',
    search: ''
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(10);

  // Status color mapping
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  // Payment status colors
  const paymentColors = {
    pending: 'bg-orange-100 text-orange-800',
    paid: 'bg-green-100 text-green-800',
    refunded: 'bg-gray-100 text-gray-800'
  };

  // Sort bookings by booking time (created_at) - most recent first
  const sortBookings = (bookingsArray) => {
    // Ensure we have an array
    if (!Array.isArray(bookingsArray)) {
      console.error('sortBookings expects an array, got:', typeof bookingsArray);
      return [];
    }
    
    return bookingsArray.sort((a, b) => {
      const createdAtA = new Date(a.created_at);
      const createdAtB = new Date(b.created_at);
      return createdAtB - createdAtA; // Descending order (most recent first)
    });
  };

  const isAppointmentTimePassed = (appointmentDate, appointmentTime) => {
    if (!appointmentDate || !appointmentTime) return false;
    
    const now = new Date();
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    
    return now > appointmentDateTime;
  };  

  const handleCancelClick = (bookingId) => {
    setCancelModal({ show: true, bookingId });
    setCancellationReason(''); // Reset reason when opening modal
  };

  const handleCompleteClick = (bookingId) => {
    setCompleteModal({ show: true, bookingId });
    setCompletionNotes(''); // Reset notes when opening modal
  };

  const confirmCancel = () => {
    if (!cancellationReason.trim()) {
      toast.error('Please provide a cancellation reason'); // Replace alert with toast
      return;
    }
    
    // You can pass the reason to handleStatusUpdate if your API supports it
    handleStatusUpdate(cancelModal.bookingId, 'cancelled', cancellationReason.trim());
    setCancelModal({ show: false, bookingId: null });
    setCancellationReason('');
  };

  const confirmComplete = () => {
    // Completion notes are optional, so we don't require them
    handleStatusUpdate(completeModal.bookingId, 'completed', completionNotes.trim());
    setCompleteModal({ show: false, bookingId: null });
    setCompletionNotes('');
  };

  const fetchBookings = async (page = currentPage) => {
    const loadingToast = toast.loading("Loading appointments...");
    
    try {
      setLoading(true);
      const response = await getShopBookings({
        ...filters,
        page,
        limit: itemsPerPage
      });
      
      console.log('Full API Response:', response);
      console.log('Response Data:', response.data);
      
      // Handle the response structure based on your API
      if (response.data) {
        // Check if the response has the direct structure (your actual API response)
        if (response.data.bookings && Array.isArray(response.data.bookings)) {
          // Direct structure with bookings array
          const bookingsArray = response.data.bookings;
          
          console.log('Bookings Array:', bookingsArray);
          console.log('Is Array:', Array.isArray(bookingsArray));
          
          // Sort the bookings array
          const sortedBookings = sortBookings(bookingsArray);
          setBookings(sortedBookings);
          
          // Set pagination info from the direct response
          setTotalPages(response.data.totalPages || 1);
          setTotalCount(response.data.totalCount || 0);
          setCurrentPage(response.data.currentPage || page);
        } else if (response.data.results && response.data.results.bookings) {
          // Nested structure (fallback)
          const resultData = response.data.results;
          const bookingsArray = resultData.bookings;
          
          console.log('Bookings Array:', bookingsArray);
          console.log('Is Array:', Array.isArray(bookingsArray));
          
          // Sort the bookings array
          const sortedBookings = sortBookings(bookingsArray);
          setBookings(sortedBookings);
          
          // Set pagination info
          setTotalPages(resultData.totalPages || 1);
          setTotalCount(resultData.totalCount || 0);
          setCurrentPage(resultData.currentPage || page);
        } else if (response.data.count !== undefined) {
          // Django REST Framework pagination structure
          const bookingsArray = response.data.results || [];
          const sortedBookings = sortBookings(bookingsArray);
          setBookings(sortedBookings);
          
          // Calculate pagination info
          const totalCount = response.data.count || 0;
          const totalPages = Math.ceil(totalCount / itemsPerPage);
          
          setTotalPages(totalPages);
          setTotalCount(totalCount);
          setCurrentPage(page);
        } else {
          // Direct array response
          const bookingsArray = Array.isArray(response.data) ? response.data : [];
          const sortedBookings = sortBookings(bookingsArray);
          setBookings(sortedBookings);
          
          // Set pagination info
          setTotalPages(1);
          setTotalCount(bookingsArray.length);
          setCurrentPage(1);
        }
      }
      
      toast.dismiss(loadingToast);
      toast.success(`Loaded ${bookings.length} appointments successfully!`);
      
    } catch (error) {
      console.error('Error fetching bookings:', error);
      // Handle error state
      setBookings([]);
      setTotalPages(1);
      setTotalCount(0);
      
      toast.dismiss(loadingToast);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getBookingStats();
      console.log('Stats Response:', response.data);
      
      if (response.data) {
        // Handle different response structures
        if (response.data.success && response.data.stats) {
          setStats(response.data.stats);
        } else if (response.data.stats) {
          setStats(response.data.stats);
        } else {
          // Direct stats object
          setStats(response.data);
        }
      }
      
      // Optional: Show success toast for stats loading
      // toast.success('Statistics loaded successfully!');
      
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default stats on error
      setStats({
        total: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        today: 0
      });
      
      toast.error('Failed to load appointment statistics');
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus, notes = '') => {
    try {
      setUpdating(prev => ({ ...prev, [bookingId]: true }));
      
      // Use toast.promise for better UX
      await toast.promise(
        updateBookingStatus(bookingId, newStatus, notes),
        {
          loading: `Updating appointment to ${newStatus}...`,
          success: (response) => {
            console.log('Update Response:', response.data);
            
            // Check if update was successful
            if (response.data && (response.data.success || response.status === 200)) {
              const currentTimestamp = new Date().toISOString();
              setBookings(prev => {
                const updatedBookings = prev.map(booking => 
                  booking.id === bookingId 
                    ? { 
                        ...booking, 
                        booking_status: newStatus,
                        ...(newStatus === 'cancelled' && { cancelled_at: currentTimestamp }),
                        ...(newStatus === 'completed' && { completed_at: currentTimestamp }),
                        ...(newStatus === 'confirmed' && { confirmed_at: currentTimestamp }),
                        ...(notes && { completion_notes: notes })
                      }
                    : booking
                );
                return sortBookings(updatedBookings);
              });
              
              // Refresh stats after status update
              fetchStats();
              
              return `Appointment ${newStatus} successfully!`;
            } else {
              throw new Error('Update failed');
            }
          },
          error: (error) => {
            console.error('Error updating booking status:', error);
            return `Failed to update appointment status`;
          }
        }
      );
      
    } catch (error) {
      // Error is already handled by toast.promise
      console.error('Status update error:', error);
    } finally {
      setUpdating(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({ status: 'all', date: '', search: '' });
    setCurrentPage(1);
    toast.success('Filters reset successfully!');
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchBookings(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  useEffect(() => {
    fetchBookings(1);
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    return new Date(dateTimeString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
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
      
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800">Appointments Management</h3>
        <div className="text-sm text-gray-500">
          Total: {totalCount} appointments
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total || 0}</div>
          <div className="text-sm text-blue-600">Total</div>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
          <div className="text-sm text-yellow-600">Pending</div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.confirmed || 0}</div>
          <div className="text-sm text-blue-600">Confirmed</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completed || 0}</div>
          <div className="text-sm text-green-600">Completed</div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600">{stats.cancelled || 0}</div>
          <div className="text-sm text-red-600">Cancelled</div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.today || 0}</div>
          <div className="text-sm text-purple-600">Today</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Customer name, email, phone..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-lg mb-2">No appointments found</div>
          <div className="text-sm">Try adjusting your filters or check back later</div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h4 className="text-lg font-semibold text-gray-800 mr-3">
                        {booking.user_name}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[booking.booking_status]}`}>
                        {booking.booking_status?.charAt(0).toUpperCase() + booking.booking_status?.slice(1)}
                      </span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${paymentColors[booking.payment_status]}`}>
                        {booking.payment_status?.charAt(0).toUpperCase() + booking.payment_status?.slice(1)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-2">
                      <div className="flex flex-wrap gap-4">
                        <span>📧 {booking.user_email}</span>
                        {booking.user_phone && <span>📞 {booking.user_phone}</span>}
                      </div>
                      
                      <div className="flex flex-wrap gap-4">
                        <span>📅 Appointment: {formatDate(booking.appointment_date)}</span>
                        <span>🕒 {formatTime(booking.appointment_time)}</span>
                        <span>💰 ₹{booking.total_amount}</span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-blue-600">
                          📋 Booked: {formatDateTime(booking.created_at)}
                        </div>
                        
                        {booking.confirmed_at && (
                          <div className="text-blue-600">
                            ✅ Confirmed: {formatDateTime(booking.confirmed_at)}
                          </div>
                        )}
                        
                        {booking.completed_at && (
                          <div className="text-green-600">
                            ✅ Completed: {formatDateTime(booking.completed_at)}
                          </div>
                        )}
                        
                        {booking.cancelled_at && (
                          <div className="text-red-600">
                            ❌ Cancelled: {formatDateTime(booking.cancelled_at)}
                          </div>
                        )}
                      </div>
                      
                      {booking.services && booking.services.length > 0 && (
                        <div>
                          <span>🛍️ Services: {booking.services.map(s => s.name).join(', ')}</span>
                        </div>
                      )}
                      
                      {booking.notes && (
                        <div className="mt-2 p-2 bg-gray-50 rounded">
                          <span className="font-medium">📝 Notes:</span>
                          <div className="mt-1 text-gray-700">{booking.notes}</div>
                        </div>
                      )}

                      {booking.completion_notes && (
                        <div className="mt-2 p-2 bg-green-50 rounded">
                          <span className="font-medium">✅ Completion Notes:</span>
                          <div className="mt-1 text-gray-700">{booking.completion_notes}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 lg:mt-0 lg:ml-4">
                    <div className="flex flex-wrap gap-2">
                      {booking.booking_status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                            disabled={updating[booking.id]}
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
                          >
                            {updating[booking.id] ? 'Updating...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => handleCancelClick(booking.id)}
                            disabled={updating[booking.id]}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
                          >
                            {updating[booking.id] ? 'Updating...' : 'Cancel'}
                          </button>
                        </>
                      )}
                      
                      {booking.booking_status === 'confirmed' && (
                        <>
                          {/* Only show Complete button if appointment time has passed */}
                          {isAppointmentTimePassed(booking.appointment_date, booking.appointment_time) ? (
                            <button
                              onClick={() => handleCompleteClick(booking.id)}
                              disabled={updating[booking.id]}
                              className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
                            >
                              {updating[booking.id] ? 'Updating...' : 'Complete'}
                            </button>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded">
                              Complete (Available after appointment time)
                            </span>
                          )}
                          
                          <button
                            onClick={() =>  handleCancelClick(booking.id)}
                            disabled={updating[booking.id]}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
                          >
                            {updating[booking.id] ? 'Updating...' : 'Cancel'}
                          </button>
                        </>
                      )}
                      
                      {(booking.booking_status === 'completed' || booking.booking_status === 'cancelled') && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded">
                          {booking.booking_status?.charAt(0).toUpperCase() + booking.booking_status?.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <div className="flex items-center text-sm text-gray-700">
                <span>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} entries
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Cancellation Modal */}
          {cancelModal.show && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Confirm Cancellation</h3>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to mark this appointment as completed?
                </p>
                
                {/* <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Completion Notes <span className="text-gray-500">(Optional)</span>
                  </label>
                  <textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="Add any notes about the completed service..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                    rows="4"
                  />
                </div> */}
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setCompleteModal({ show: false, bookingId: null });
                      setCompletionNotes('');
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmComplete}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Complete Appointment
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AppointmentsContent;