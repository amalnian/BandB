import React, { useState, useEffect } from 'react';
import { getUserBookings, cancelBooking, submitBookingFeedback } from '@/endpoints/APIs';
import { Calendar, Clock, MapPin, Phone, Mail, CreditCard, AlertCircle, X, Star, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const UserBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  // Feedback modal state
  const [feedbackData, setFeedbackData] = useState({
    rating: 0,
    feedback_text: '',
    service_quality: 0,
    staff_behavior: 0,
    cleanliness: 0,
    value_for_money: 0
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [currentPage, pageSize]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: currentPage,
        limit: pageSize
      };
      
      const response = await getUserBookings(params);
      
      // Handle paginated response
      if (response.data.results) {
        setBookings(response.data.results);
        setTotalCount(response.data.count);
        setTotalPages(response.data.total_pages);
      } else {
        // Fallback for non-paginated response
        setBookings(response.data);
        setTotalCount(response.data.length);
        setTotalPages(1);
      }
    } catch (err) {
      setError('Failed to fetch bookings');
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleCancelClick = (booking) => {
    setSelectedBooking(booking);
    setShowCancelModal(true);
    setCancellationReason('');
  };

  const handleFeedbackClick = (booking) => {
    setSelectedBooking(booking);
    setShowFeedbackModal(true);
    setFeedbackData({
      rating: 0,
      feedback_text: '',
      service_quality: 0,
      staff_behavior: 0,
      cleanliness: 0,
      value_for_money: 0
    });
  };

  const handleCancelConfirm = async () => {
    if (!cancellationReason.trim()) {
      setError('Please provide a cancellation reason');
      return;
    }

    try {
      setCancelling(true);
      
      console.log('Canceling booking:', {
        bookingId: selectedBooking.id,
        reason: cancellationReason.trim()
      });
      
      const response = await cancelBooking(selectedBooking.id, cancellationReason.trim());
      
      console.log('Cancel response:', response);
      
      if (response.data.refund) {
        console.log(`${response.data.message}. ${response.data.refund.message}`);
      } else {
        console.log(response.data.message);
      }
      
      await fetchBookings();
      setShowCancelModal(false);
      setCancellationReason('');
      setSelectedBooking(null);
      
    } catch (error) {
      console.error('Error cancelling booking:', error);
      
      let errorMessage = 'Failed to cancel booking. Please try again.';
      
      if (error.response) {
        console.log('Error response:', error.response.data);
        
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setError(errorMessage);
    } finally {
      setCancelling(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (feedbackData.rating === 0) {
      setError('Please provide a rating');
      return;
    }

    try {
      setSubmittingFeedback(true);
      
      const response = await submitBookingFeedback(selectedBooking.id, feedbackData);
      
      console.log('Feedback submitted:', response);
      
      await fetchBookings();
      
      setShowFeedbackModal(false);
      setSelectedBooking(null);
      setError('');
      
      console.log('Feedback submitted successfully!');
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      
      let errorMessage = 'Failed to submit feedback. Please try again.';
      
      if (error.response && error.response.data.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const StarRating = ({ rating, onRatingChange, label, disabled = false }) => {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700 w-32">{label}:</span>
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => !disabled && onRatingChange(star)}
              className={`p-1 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'} transition-transform`}
              disabled={disabled}
            >
              <Star
                className={`h-6 w-6 ${
                  star <= rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'refunded': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canCancelBooking = (booking) => {
    return booking.booking_status !== 'completed' && booking.booking_status !== 'cancelled';
  };

  const canGiveFeedback = (booking) => {
    return booking.booking_status === 'completed' && !booking.has_feedback;
  };

  const Pagination = () => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 3; i <= totalPages; i++) {
            pages.push(i);
          }
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = currentPage - 1; i <= currentPage + 1; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(totalPages);
        }
      }
      
      return pages;
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} bookings
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">Show:</label>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="flex space-x-1">
              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() => typeof page === 'number' && handlePageChange(page)}
                  disabled={typeof page !== 'number'}
                  className={`px-3 py-1 text-sm rounded ${
                    page === currentPage
                      ? 'bg-blue-600 text-white'
                      : typeof page === 'number'
                      ? 'text-gray-700 hover:bg-gray-100'
                      : 'text-gray-400 cursor-default'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
            <p className="text-gray-600 mt-1">Manage your appointments and bookings</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-500">You haven't made any bookings yet.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {bookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="p-4">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{booking.shop_name}</h3>
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.booking_status)}`}>
                            {booking.booking_status.charAt(0).toUpperCase() + booking.booking_status.slice(1)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.payment_status)}`}>
                            {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
                          </span>
                          {booking.has_feedback && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Feedback Given
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 mt-3 sm:mt-0">
                        <span className="text-xl font-bold text-blue-600">₹{booking.total_amount}</span>
                        {canCancelBooking(booking) && (
                          <button
                            onClick={() => handleCancelClick(booking)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                        {canGiveFeedback(booking) && (
                          <button
                            onClick={() => handleFeedbackClick(booking)}
                            className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors flex items-center space-x-1"
                          >
                            <Star className="h-3 w-3" />
                            <span>Review</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Info Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <div className="flex items-center text-gray-600 text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                        <span>{formatDate(booking.appointment_date)}</span>
                      </div>
                      <div className="flex items-center text-gray-600 text-sm">
                        <Clock className="h-4 w-4 mr-2 text-green-500" />
                        <span>{booking.appointment_time}</span>
                      </div>
                      <div className="flex items-center text-gray-600 text-sm">
                        <CreditCard className="h-4 w-4 mr-2 text-purple-500" />
                        <span className="capitalize">{booking.payment_method}</span>
                      </div>
                    </div>

                    {/* Services */}
                    {booking.services && booking.services.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1">
                          {booking.services.map((service, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                              {service.name} - ₹{service.price}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {booking.notes && (
                      <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                        <span className="font-medium text-gray-700">Notes: </span>
                        <span className="text-gray-600">{booking.notes}</span>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t">
                      <span>Created: {formatDate(booking.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Component */}
            <Pagination />
          </>
        )}

        {/* Cancellation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Cancel Booking</h3>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-2">
                  Are you sure you want to cancel your booking at <strong>{selectedBooking?.shop_name}</strong>?
                </p>
                <p className="text-sm text-gray-500">
                  Date: {selectedBooking && formatDate(selectedBooking.appointment_date)} at {selectedBooking?.appointment_time}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for cancellation <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Please provide a reason for cancellation..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows="4"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={cancelling}
                >
                  Keep Booking
                </button>
                <button
                  onClick={handleCancelConfirm}
                  disabled={cancelling || !cancellationReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Booking'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Modal */}
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Star className="h-5 w-5 mr-2 text-yellow-500" />
                  Rate Your Experience
                </h3>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-1">
                  How was your experience at <strong>{selectedBooking?.shop_name}</strong>?
                </p>
                <p className="text-sm text-gray-500">
                  {selectedBooking && formatDate(selectedBooking.appointment_date)} at {selectedBooking?.appointment_time}
                </p>
              </div>

              <div className="space-y-4">
                {/* Overall Rating */}
                <div className="border-b pb-4">
                  <StarRating
                    rating={feedbackData.rating}
                    onRatingChange={(rating) => setFeedbackData(prev => ({ ...prev, rating }))}
                    label="Overall Rating"
                  />
                </div>

                {/* Detailed Ratings */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Rate specific aspects:</h4>
                  
                  <StarRating
                    rating={feedbackData.service_quality}
                    onRatingChange={(rating) => setFeedbackData(prev => ({ ...prev, service_quality: rating }))}
                    label="Service Quality"
                  />
                  
                  <StarRating
                    rating={feedbackData.staff_behavior}
                    onRatingChange={(rating) => setFeedbackData(prev => ({ ...prev, staff_behavior: rating }))}
                    label="Staff Behavior"
                  />
                  
                  <StarRating
                    rating={feedbackData.cleanliness}
                    onRatingChange={(rating) => setFeedbackData(prev => ({ ...prev, cleanliness: rating }))}
                    label="Cleanliness"
                  />
                  
                  <StarRating
                    rating={feedbackData.value_for_money}
                    onRatingChange={(rating) => setFeedbackData(prev => ({ ...prev, value_for_money: rating }))}
                    label="Value for Money"
                  />
                </div>

                {/* Feedback Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Comments (Optional)
                  </label>
                  <textarea
                    value={feedbackData.feedback_text}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, feedback_text: e.target.value }))}
                    placeholder="Share your experience, suggestions, or any additional comments..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    rows="4"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submittingFeedback}
                >
                  Cancel
                </button>
                <button
                  onClick={handleFeedbackSubmit}
                  disabled={submittingFeedback || feedbackData.rating === 0}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {submittingFeedback ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Review'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserBookings;