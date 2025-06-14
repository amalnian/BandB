import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { getShopServices, getShopBusinessHours, createBooking, getAvailableTimeSlots } from "@/endpoints/APIs"
import { useRazorpay } from '../user/Hooks/useRazorpay'
import { toast } from 'react-hot-toast'

const BookingAppointment = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedServices, setSelectedServices] = useState([])
  const [selectedTime, setSelectedTime] = useState("")
  
  // Real data states
  const [services, setServices] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [businessHours, setBusinessHours] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bookingLoading, setBookingLoading] = useState(false)
  
  // Duration calculation states
  const [totalDuration, setTotalDuration] = useState(0)
  const [slotsNeeded, setSlotsNeeded] = useState(1)

  const { shopId } = useParams()
  const navigate = useNavigate()
  
  const { initiatePayment, isLoading: razorpayLoading } = useRazorpay()

  // Fetch shop data on component mount
  useEffect(() => {
    fetchShopData()
  }, [shopId])
  
  // Fetch time slots when date or services change
  useEffect(() => {
    if (selectedDate && businessHours.length > 0) {
      fetchTimeSlots()
    }
  }, [selectedDate, shopId, businessHours, selectedServices])
  
  // Calculate duration when services change
  useEffect(() => {
    calculateDuration()
  }, [selectedServices, services])


  const fetchShopData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching shop data for shopId:', shopId)
      
      const [servicesResponse, businessHoursResponse] = await Promise.all([
        getShopServices(shopId),
        getShopBusinessHours(shopId)
      ])
      
      console.log('Services Response:', servicesResponse)
      console.log('Business Hours Response:', businessHoursResponse)
      
      // Extract data from response
      const servicesData = servicesResponse?.data?.data || servicesResponse?.data || []
      const businessHoursData = businessHoursResponse?.data?.data || businessHoursResponse?.data || []
      
      // Ensure services is always an array
      setServices(Array.isArray(servicesData) ? servicesData : [])
      
      // Ensure businessHours is always an array
      setBusinessHours(Array.isArray(businessHoursData) ? businessHoursData : [])
      
      // Set first service as default if services exist
      if (servicesData && servicesData.length > 0) {
        setSelectedServices([servicesData[0].id])
      }
      
      console.log('Processed services:', servicesData)
      console.log('Processed business hours:', businessHoursData)
      
    } catch (err) {
      console.error('Error fetching shop data:', err)
      setError('Failed to load shop data. Please try again.')
      setServices([])
      setBusinessHours([])
    } finally {
      setLoading(false)
    }
  }
  
  const calculateDuration = () => {
    if (!Array.isArray(services) || services.length === 0 || selectedServices.length === 0) {
      setTotalDuration(0)
      setSlotsNeeded(1)
      return
    }
    
    const total = selectedServices.reduce((sum, serviceId) => {
      const service = services.find(s => s.id === serviceId)
      return sum + (service ? (service.duration_minutes || 30) : 30)
    }, 0)
    
    setTotalDuration(total)
    setSlotsNeeded(Math.ceil(total / 30))
    
    console.log('Duration calculation:', { total, slotsNeeded: Math.ceil(total / 30) })
  }
  
// Fixed fetchTimeSlots function
const fetchTimeSlots = async () => {
  try {
    // Fix: Use local date formatting to avoid timezone issues
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    console.log('Fetching time slots for date:', dateStr, 'with services:', selectedServices);
    
    // Build parameters object - services should be sent as individual query params
    const params = new URLSearchParams();
    params.append('date', dateStr);
    
    // Add each service as a separate 'services' parameter
    selectedServices.forEach(serviceId => {
      params.append('services', serviceId);
    });
    
    console.log('API params:', Object.fromEntries(params));
    
    // Use the params directly with axios
    const response = await getAvailableTimeSlots(shopId, params);
    console.log('Time slots response:', response);
    
    // Extract time slots from response
    let timeSlotsData = [];
    if (response?.data?.success && response?.data?.data?.time_slots) {
      timeSlotsData = response.data.data.time_slots;
    } else if (response?.data?.time_slots) {
      timeSlotsData = response.data.time_slots;
    }
    
    console.log('Processed time slots:', timeSlotsData);
    
    setTimeSlots(Array.isArray(timeSlotsData) ? timeSlotsData : []);
    
    // Reset selected time when date or services change
    setSelectedTime("");
    
    // Auto-select first available time slot
    const firstAvailable = timeSlotsData.find(slot => slot.available && !slot.is_past);
    if (firstAvailable) {
      setSelectedTime(firstAvailable.time);
    }
    
  } catch (err) {
    console.error('Error fetching time slots:', err);
    console.error('Error response:', err.response?.data);
    setTimeSlots([]);
  }
};


  // Helper function to call API with services parameter
  const getAvailableTimeSlotsWithServices = async (shopId, queryString) => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken')
    const response = await fetch(`/api/shops/${shopId}/available-slots/?${queryString}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  }

  const handleBackClick = () => {
    navigate(`/shop/${shopId}`)
  }

  // Calendar helper functions
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getPreviousMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() - 1)
    setCurrentDate(newDate)
  }

  const getNextMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + 1)
    setCurrentDate(newDate)
  }

  const isDateSelected = (day) => {
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentDate.getMonth() &&
      selectedDate.getFullYear() === currentDate.getFullYear()
    )
  }

  const isDateToday = (day) => {
    const today = new Date()
    return (
      today.getDate() === day &&
      today.getMonth() === currentDate.getMonth() &&
      today.getFullYear() === currentDate.getFullYear()
    )
  }

  const isDatePast = (day) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return dateToCheck < today
  }

  const isDateAvailable = (day) => {
    if (!Array.isArray(businessHours) || businessHours.length === 0) {
      return true
    }
    
    const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const dayOfWeek = dateToCheck.getDay() === 0 ? 6 : dateToCheck.getDay() - 1
    
    const businessHour = businessHours.find(bh => bh.day_of_week === dayOfWeek)
    
    if (!businessHour) {
      return true
    }
    
    return !businessHour.is_closed
  }

// Fixed selectDate function
const selectDate = (day) => {
  const isPast = isDatePast(day);
  const isAvailable = isDateAvailable(day);
  
  console.log(`Selecting date ${day}: isPast=${isPast}, isAvailable=${isAvailable}`);
  
  if (!isPast && isAvailable) {
    // Fix: Create date in local timezone to avoid shifts
    const newSelectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    console.log('New selected date:', newSelectedDate);
    setSelectedDate(newSelectedDate);
  }
};

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDayOfMonth = getFirstDayOfMonth(currentDate)
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isPast = isDatePast(day)
      const isSelected = isDateSelected(day)
      const isToday = isDateToday(day)
      const isAvailable = isDateAvailable(day)

      days.push(
        <button
          key={day}
          onClick={() => selectDate(day)}
          disabled={isPast || !isAvailable}
          className={`
            h-10 w-10 rounded-full text-sm font-medium transition-colors relative
            ${
              isSelected
                ? "bg-gray-900 text-white"
                : isPast || !isAvailable
                  ? "text-gray-300 cursor-not-allowed"
                  : isToday
                    ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                    : "text-gray-700 hover:bg-gray-200"
            }
          `}
        >
          {day}
          {isToday && !isSelected && (
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
          )}
        </button>
      )
    }

    return days
  }

  const toggleService = (serviceId) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    )
  }

  const calculateTotal = () => {
    if (!Array.isArray(services) || services.length === 0) {
      return 25
    }
    
    const serviceTotal = selectedServices.reduce((total, serviceId) => {
      const service = services.find((s) => s.id === serviceId)
      return total + (service ? parseFloat(service.price) : 0)
    }, 0)
    const serviceFee = 25
    return serviceTotal + serviceFee
  }

  const getSelectedServiceDetails = () => {
    if (!Array.isArray(services) || services.length === 0) {
      return []
    }
    
    return selectedServices.map((serviceId) => services.find((s) => s.id === serviceId)).filter(Boolean)
  }

  const formatSelectedDate = () => {
    return selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
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

const handleBooking = async (paymentMethod) => {
  if (!selectedServices.length || !selectedTime) {
    toast.error('Please select services and time slot')
    return
  }

  const bookingData = {
    shop: parseInt(shopId),
    services: selectedServices,
    appointment_date: selectedDate.toISOString().split('T')[0],
    appointment_time: selectedTime,
    total_amount: calculateTotal(),
    payment_method: paymentMethod
  }

  if (paymentMethod === 'wallet') {
    // Existing wallet payment logic
    try {
      setBookingLoading(true)
      console.log('Booking data:', bookingData)
      
      const response = await createBooking(bookingData)
      console.log('Booking response:', response)
      
      toast.success('Booking created successfully!')
      
      const bookingId = response?.data?.data?.id || response?.data?.id
      if (bookingId) {
        navigate(`/booking-confirmation/${bookingId}`)
      } else {
        navigate(`/shop/${shopId}`)
      }
      
    } catch (err) {
      console.error('Booking failed:', err)
      const errorMessage = err?.response?.data?.error || err?.message || 'Booking failed. Please try again.'
      toast.error(errorMessage)
    } finally {
      setBookingLoading(false)
    }
  } else if (paymentMethod === 'razorpay') {
    // Razorpay payment logic
    const paymentData = {
      amount: calculateTotal(),
      businessName: 'Your Business Name', // Replace with actual business name
      description: `Booking for ${getSelectedServiceDetails().map(s => s.name).join(', ')}`,
      bookingData: bookingData,
      customerName: '', // Add customer details if available
      customerEmail: '',
      customerPhone: '',
      themeColor: '#3399cc'
    }

    initiatePayment(
      paymentData,
      // Success callback
      (response) => {
        console.log('Payment successful:', response)
        toast.success('Payment successful! Booking confirmed.')
        
        // Navigate to confirmation page using booking ID from verification response
        const bookingId = response.booking_data?.booking_id
        if (bookingId) {
          navigate(`/booking-confirmation/${bookingId}`)
        } else {
          navigate(`/shop/${shopId}`)
        }
      },
      // Failure callback
      (error) => {
        console.error('Payment failed:', error)
        toast.error(`Payment failed: ${error.message}`)
      }
    )
  }
}

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading shop details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchShopData}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="flex items-center p-4 md:p-6 border-b border-gray-200">
          <button 
            onClick={handleBackClick}
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
          <h1 className="text-lg md:text-xl font-semibold text-gray-900">Book Appointment</h1>
        </div>

        <div className="p-4 md:p-6 space-y-8">
          {/* Choose Date Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose date</h2>
            
            {/* Selected Date Display */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Selected: {formatSelectedDate()}</p>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={getPreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 18L9 12L15 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <h3 className="text-base font-medium text-gray-900">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <button 
                onClick={getNextMonth}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 18L15 12L9 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* Calendar */}
            <div className="bg-gray-50 rounded-2xl p-4">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {dayNames.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {renderCalendarDays()}
              </div>
            </div>

            {/* Calendar Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-100 rounded-full"></div>
                <span>Today</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-900 rounded-full"></div>
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                <span>Unavailable</span>
              </div>
            </div>
          </div>

          {/* Choose Service Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Service</h2>
            
            {/* Duration Summary */}
            {totalDuration > 0 && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700 font-medium">Total Duration:</span>
                  <span className="text-green-800 font-semibold">{formatDuration(totalDuration)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-green-600">Slots needed:</span>
                  <span className="text-green-700">{slotsNeeded} × 30min slots</span>
                </div>
              </div>
            )}

            {services.length === 0 ? (
              <p className="text-gray-500">No services available</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => toggleService(service.id)}
                    className="relative cursor-pointer group"
                  >
                    <div
                      className={`
                      flex flex-col items-center p-4 rounded-2xl border-2 transition-all
                      ${
                        selectedServices.includes(service.id)
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200 hover:border-gray-300"
                      }
                    `}
                    >
                      {/* Service Image */}
                      <div className="relative mb-3">
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-2xl">✂️</span>
                        </div>
                        {selectedServices.includes(service.id) && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                              <path
                                d="M20 6L9 17L4 12"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Service Info */}
                      <h3 className="text-sm font-medium text-gray-900 text-center mb-1">{service.name}</h3>
                      <p className="text-sm text-gray-600">${service.price}</p>
                      <p className="text-xs text-gray-500">{service.duration_minutes} min</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Time Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Available time</h2>
            
            {/* Time slots info */}
            {selectedServices.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">Note:</span> Time slots show when your appointment will start. 
                  Your appointment will end at the displayed end time based on selected services.
                </p>
              </div>
            )}

            {timeSlots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-2">No time slots available for selected date</p>
                <p className="text-sm text-gray-400">Try selecting a different date or fewer services</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available || slot.is_past}
                    className={`
                      py-3 px-4 rounded-xl text-sm font-medium transition-colors relative
                      ${
                        selectedTime === slot.time
                          ? "bg-gray-900 text-white"
                          : slot.available && !slot.is_past
                            ? "bg-gray-100 text-gray-900 hover:bg-gray-200"
                            : "bg-gray-50 text-gray-400 cursor-not-allowed"
                      }
                    `}
                    title={slot.available ? 
                      `${slot.time} - ${slot.end_time} (30 min slot)${slot.service_end_time ? ` | Service ends: ${slot.service_end_time}` : ''}` : 
                      'Not available'
                    }                  
                    >
                  <div className="text-center">
                    <div className="font-semibold">{slot.time}</div>
                    <div className="text-xs opacity-75">to {slot.end_time}</div>
                    {slot.service_end_time && slot.service_end_time !== slot.end_time && (
                      <div className="text-xs opacity-60">Service ends: {slot.service_end_time}</div>
                    )}
                    {slot.is_past && (
                      <div className="text-xs text-red-400">Past</div>
                    )}
                  </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payment Summary Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment summary</h2>
            <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
              {getSelectedServiceDetails().map((service) => (
                <div key={service.id} className="flex justify-between items-center">
                  <div className="flex-1">
                    <span className="text-gray-700">{service.name}</span>
                    <span className="text-xs text-gray-500 ml-2">({service.duration_minutes} min)</span>
                  </div>
                  <span className="font-semibold text-gray-900">${service.price}</span>
                </div>
              ))}

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="text-gray-700">Service fee</span>
                <span className="font-semibold text-gray-900">$25</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-300 text-lg font-bold">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">${calculateTotal()}</span>
              </div>

              {/* Appointment Summary */}
              {selectedTime && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-2">Appointment Details</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Date:</span> {formatSelectedDate()}</p>
                    <p><span className="font-medium">Time:</span> {selectedTime}</p>
                    <p><span className="font-medium">Duration:</span> {formatDuration(totalDuration)}</p>
                    <p><span className="font-medium">Services:</span> {getSelectedServiceDetails().map(s => s.name).join(', ')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button 
              onClick={() => handleBooking('wallet')}
              disabled={bookingLoading || razorpayLoading || !selectedServices.length || !selectedTime}
              className="flex-1 bg-gray-900 text-white py-4 px-6 rounded-2xl font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bookingLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>Pay using wallet</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="ml-2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" />
                    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </>
              )}
            </button>

            <button 
              onClick={() => handleBooking('razorpay')}
              disabled={bookingLoading || razorpayLoading || !selectedServices.length || !selectedTime}
              className="flex-1 bg-purple-600 text-white py-4 px-6 rounded-2xl font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {razorpayLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>Pay with Razorpay</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="ml-2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" />
                    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingAppointment