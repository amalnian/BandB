import React, { useState, useEffect } from 'react';
import { getShopBookings, updateBookingStatus, getBookingStats } from '@/endpoints/APIs';

const AppointmentsContent = () => {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [filters, setFilters] = useState({
    status: 'all',
    date: '',
    search: ''
  });

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

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await getShopBookings(filters);
      if (response.data.success) {
        setBookings(response.data.bookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getBookingStats();
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      setUpdating(prev => ({ ...prev, [bookingId]: true }));
      const response = await updateBookingStatus(bookingId, newStatus);
      
      if (response.data.success) {
        // Update the booking in the list
        setBookings(prev => 
          prev.map(booking => 
            booking.id === bookingId 
              ? { ...booking, booking_status: newStatus }
              : booking
          )
        );
        // Refresh stats
        fetchStats();
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      alert('Failed to update booking status');
    } finally {
      setUpdating(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ status: 'all', date: '', search: '' });
  };

  useEffect(() => {
    fetchBookings();
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
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
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800">Appointments Management</h3>
        <div className="text-sm text-gray-500">
          Total: {stats.total || 0} appointments
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
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h4 className="text-lg font-semibold text-gray-800 mr-3">
                      {booking.user_name}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[booking.booking_status]}`}>
                      {booking.booking_status.charAt(0).toUpperCase() + booking.booking_status.slice(1)}
                    </span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${paymentColors[booking.payment_status]}`}>
                      {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex flex-wrap gap-4">
                      <span>📧 {booking.user_email}</span>
                      {booking.user_phone && <span>📞 {booking.user_phone}</span>}
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <span>📅 {formatDate(booking.appointment_date)}</span>
                      <span>🕒 {formatTime(booking.appointment_time)}</span>
                      <span>💰 ₹{booking.total_amount}</span>
                    </div>
                    {booking.services.length > 0 && (
                      <div>
                        <span>🛍️ Services: {booking.services.map(s => s.name).join(', ')}</span>
                      </div>
                    )}
                    {booking.notes && (
                      <div>
                        <span>📝 Notes: {booking.notes}</span>
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
                          onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                          disabled={updating[booking.id]}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
                        >
                          {updating[booking.id] ? 'Updating...' : 'Cancel'}
                        </button>
                      </>
                    )}
                    
                    {booking.booking_status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(booking.id, 'completed')}
                          disabled={updating[booking.id]}
                          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
                        >
                          {updating[booking.id] ? 'Updating...' : 'Complete'}
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                          disabled={updating[booking.id]}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
                        >
                          {updating[booking.id] ? 'Updating...' : 'Cancel'}
                        </button>
                      </>
                    )}
                    
                    {(booking.booking_status === 'completed' || booking.booking_status === 'cancelled') && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded">
                        {booking.booking_status.charAt(0).toUpperCase() + booking.booking_status.slice(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentsContent;