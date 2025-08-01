import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom" // Add this import
import { getUserBookings } from "@/endpoints/APIs"
import { toast } from 'react-hot-toast'

const BookingConfirmation = ({ bookingId }) => {
  const navigate = useNavigate() // Add this hook
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails()
    } else {
      // If no bookingId provided, get the latest booking
      fetchLatestBooking()
    }
  }, [bookingId])

  const fetchBookingDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get all user bookings and find the specific one
      const response = await getUserBookings()
      console.log('Bookings response:', response)
      
      const bookingsData = response?.data?.results || response?.data || []
      
      if (bookingId) {
        const foundBooking = bookingsData.find(b => b.id === parseInt(bookingId))
        if (foundBooking) {
          setBooking(foundBooking)
        } else {
          setError('Booking not found')
        }
      } else {
        // Get the latest booking (most recent)
        if (bookingsData.length > 0) {
          const latestBooking = bookingsData[0] // Assuming the API returns bookings in descending order
          setBooking(latestBooking)
        } else {
          setError('No bookings found')
        }
      }
    } catch (err) {
      console.error('Error fetching booking details:', err)
      setError('Failed to load booking details')
      toast.error('Failed to load booking details')
    } finally {
      setLoading(false)
    }
  }

  const fetchLatestBooking = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await getUserBookings()
      console.log('Latest booking response:', response)
      
      const bookingsData = response?.data?.results || response?.data || []
      
      if (bookingsData.length > 0) {
        // Get the most recent booking
        const latestBooking = bookingsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
        setBooking(latestBooking)
      } else {
        setError('No bookings found')
      }
    } catch (err) {
      console.error('Error fetching latest booking:', err)
      setError('Failed to load booking details')
      toast.error('Failed to load booking details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':')
    const time = new Date()
    time.setHours(parseInt(hours), parseInt(minutes))
    return time.toLocaleTimeString("en-US", {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  const getTotalDuration = () => {
    if (!booking?.services || !Array.isArray(booking.services)) return 0
    return booking.services.reduce((total, service) => {
      return total + (service.duration_minutes || 30) // Default to 30 minutes if not provided
    }, 0)
  }

  const getBookingStatusColor = (status) => {
    const statusColors = {
      'confirmed': 'text-green-600',
      'pending': 'text-yellow-600',
      'cancelled': 'text-red-600',
      'completed': 'text-blue-600'
    }
    return statusColors[status] || 'text-gray-600'
  }

  const getPaymentStatusColor = (status) => {
    const statusColors = {
      'paid': 'text-green-600',
      'pending': 'text-yellow-600',
      'failed': 'text-red-600',
      'refunded': 'text-blue-600'
    }
    return statusColors[status] || 'text-gray-600'
  }

  // Updated navigation handlers
  const handleBackToHome = () => {
    navigate('/', { replace: true })
  }

  const handleViewBookings = () => {
    navigate('/bookings')
  }

  const handleGiveFeedback = () => {
    navigate(`/feedback/${booking?.id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-red-600">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
              <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={handleBackToHome}
            className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto bg-white min-h-screen">
        {/* Success Animation */}
        <div className="text-center pt-16 pb-8">
          <div className="relative">
            {/* Animated checkmark */}
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-green-600">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1"/>
                <path
                  d="M9 12l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            
            {/* Success message */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600 mb-2">Your appointment has been successfully booked</p>
            <p className="text-sm text-gray-500">Booking ID: #{booking?.id}</p>
          </div>
        </div>

        {/* Booking Details Card */}
        <div className="px-6 pb-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            
            {/* Shop Info */}
            <div className="border-b border-gray-100 pb-4 mb-6">
              <h2 className="text-xl font-semibold text-gray-900">{booking?.shop_name}</h2>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mr-2">
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span className={`capitalize font-medium ${getBookingStatusColor(booking?.booking_status)}`}>
                    {booking?.booking_status || 'confirmed'}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mr-2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span className={`capitalize font-medium ${getPaymentStatusColor(booking?.payment_status)}`}>
                    {booking?.payment_status || 'paid'}
                  </span>
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Appointment Details</h3>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-3 text-gray-500">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                        <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                        <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <div>
                        <p className="font-medium text-gray-900">Date</p>
                        <p className="text-sm text-gray-600">{formatDate(booking?.appointment_date)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-3 text-gray-500">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <div>
                        <p className="font-medium text-gray-900">Time</p>
                        <p className="text-sm text-gray-600">{formatTime(booking?.appointment_time)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-3 text-gray-500">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <div>
                        <p className="font-medium text-gray-900">Duration</p>
                        <p className="text-sm text-gray-600">{formatDuration(getTotalDuration())}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Services</h3>
                <div className="space-y-2">
                  {booking?.services?.map((service, index) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{service.name}</p>
                        {service.duration_minutes && (
                          <p className="text-sm text-gray-500">{service.duration_minutes} minutes</p>
                        )}
                      </div>
                      <p className="font-semibold text-gray-900">₹{service.price}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Info */}
              {booking?.user_name && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium text-gray-900">{booking.user_name}</span>
                    </div>
                    {booking.user_email && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium text-gray-900">{booking.user_email}</span>
                      </div>
                    )}
                    {booking.user_phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium text-gray-900">{booking.user_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {booking?.notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{booking.notes}</p>
                </div>
              )}

              {/* Payment Info */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900">Payment Method</span>
                  <span className="text-sm text-gray-600 capitalize">{booking?.payment_method}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900">Payment Status</span>
                  <span className={`text-sm capitalize font-medium ${getPaymentStatusColor(booking?.payment_status)}`}>
                    {booking?.payment_status || 'paid'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                  <span className="text-lg font-bold text-green-600">₹{booking?.total_amount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-8 space-y-4">
          {/* Show feedback button if booking is completed and feedback can be given */}
          {booking?.can_give_feedback && (
            <button 
              onClick={handleGiveFeedback}
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-2xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Give Feedback
            </button>
          )}
          
          {/* Show feedback if already given */}
          {booking?.has_feedback && booking?.feedback && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-2 text-green-600">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span className="font-medium text-green-800">Your Feedback</span>
              </div>
              <div className="text-sm text-green-700">
                <p className="mb-1">Rating: {booking.feedback.rating}/5 ⭐</p>
                {booking.feedback.feedback_text && (
                  <p className="italic">"{booking.feedback.feedback_text}"</p>
                )}
              </div>
            </div>
          )}
          
          <button 
            onClick={handleViewBookings}
            className="w-full bg-gray-900 text-white py-4 px-6 rounded-2xl font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
              <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2"/>
              <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2"/>
              <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2"/>
              <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2"/>
            </svg>
            View My Bookings
          </button>
          
          <button 
            onClick={handleBackToHome}
            className="w-full bg-gray-100 text-gray-900 py-4 px-6 rounded-2xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2"/>
              <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default BookingConfirmation