import axios from '../axiosinterceptor/UserInterceptor'
axios.defaults.withCredentials = true;

// Authentication APIs
export const login = (formBody) => axios.post("token/", formBody)
export const logout = () => axios.post('logout/', {})

// Password Reset APIs
export const forgotPassword = (email) => axios.post('forgot-password/', { email })
export const verifyForgotOtp = (formBody) => axios.post('verify-forgot-password-otp/', formBody)
export const resetPassword = (formBody) => axios.post('reset-password/', formBody)
export const googleSignIn = (credential) => {
  return axios.post('google/', { credential });
};

export const getNearbyBarbers = (locationData) => {
  return axios.post('barber-shops/nearby/', {
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    radius: locationData.radius || 10, // radius in kilometers
    limit: locationData.limit || 20
  });
};

export const getBarberById = (id) => axios.get(`barber-shops/${id}/`);

export const getBarberReviews = (barberId, params = {}) => {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 10
  }).toString();
  
  return axios.get(`barber-shops/${barberId}/reviews/?${queryParams}`);
};

// Search and Filter APIs
export const searchBarbers = (searchData) => {
  return axios.post('barber-shops/search/', {
    query: searchData.query,
    location: searchData.location,
    price_range: searchData.price_range,
    rating_min: searchData.rating_min,
    services: searchData.services,
    page: searchData.page || 1,
    limit: searchData.limit || 20
  });
};

export const getBarberServices = (barberId) => axios.get(`barber-shops/${barberId}/services/`);

// Booking APIs
export const getAvailableSlots = (barberId, date) => {
  return axios.get(`barber-shops/${barberId}/available-slots/`, {
    params: { date }
  });
};

// export const createBooking = (bookingData) => {
//   return axios.post('bookings/', {
//     barber_shop_id: bookingData.barber_shop_id,
//     service_ids: bookingData.service_ids,
//     booking_date: bookingData.booking_date,
//     booking_time: bookingData.booking_time,
//     notes: bookingData.notes
//   });
// };

// export const getUserBookings = (params = {}) => {
//   const queryParams = new URLSearchParams({
//     page: params.page || 1,
//     limit: params.limit || 10,
//     status: params.status || 'all' // upcoming, completed, cancelled, all
//   }).toString();
  
//   return axios.get(`user/bookings/?${queryParams}`);
// };

// export const cancelBooking = (bookingId, reason) => {
//   return axios.patch(`bookings/${bookingId}/cancel/`, { reason });
// };

// Review APIs
export const createReview = (reviewData) => {
  return axios.post('reviews/', {
    barber_shop_id: reviewData.barber_shop_id,
    booking_id: reviewData.booking_id,
    rating: reviewData.rating,
    comment: reviewData.comment
  });
};

export const updateReview = (reviewId, reviewData) => {
  return axios.patch(`reviews/${reviewId}/`, reviewData);
};

export const deleteReview = (reviewId) => axios.delete(`reviews/${reviewId}/`);

// User Profile APIs - Updated for new backend structure
export const getUserProfile = () => axios.get('user/profile/');

export const updateUserProfile = (profileData) => {
  return axios.patch('user/profile/update/', profileData);
};

export const changePassword = (passwordData) => {
  return axios.post('user/change-password/', passwordData);
};

export const uploadProfilePicture = (formData) => {
  return axios.post('user/profile-picture/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const deleteProfilePicture = () => {
  return axios.delete('user/profile-picture/');
};

export const getUserStats = () => axios.get('user/stats/');

// Legacy API support (deprecated - use getUserProfile instead)
export const uploadUserAvatar = (formData) => {
  console.warn('uploadUserAvatar is deprecated. Use uploadProfilePicture instead.');
  return uploadProfilePicture(formData);
};


// Notification APIs
export const getNotifications = (params = {}) => {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 20,
    is_read: params.is_read
  }).toString();
  
  return axios.get(`user/notifications/?${queryParams}`);
};

export const markNotificationAsRead = (notificationId) => {
  return axios.patch(`user/notifications/${notificationId}/`, { is_read: true });
};

export const markAllNotificationsAsRead = () => {
  return axios.patch('user/notifications/mark-all-read/');
};

// Categories and Services APIs
export const getServiceCategories = () => axios.get('service-categories/');
export const getServices = (categoryId = null) => {
  const url = categoryId ? `services/?category=${categoryId}` : 'services/';
  return axios.get(url);
};


// Location APIs
export const updateUserLocation = (locationData) => 
  axios.post('user/update-location/', locationData)

export const getNearbyShops = (params) => 
  axios.get('shops/nearby/', { params })

export const getShops = () => 
  axios.get('shops/')

export const shopDetail = (shopId) => 
  axios.get(`shopdetail/${shopId}/`)

// Alternative: Combined function that handles both location update and nearby search
export const searchNearbyShops = (locationData) => 
  axios.post('shops/search-nearby/', locationData)

// Shop APIs
export const getShopServices = (shopId) => axios.get(`shops/${shopId}/services/`)
export const getShopBusinessHours = (shopId) => axios.get(`shops/${shopId}/business-hours/`)

// Booking APIs
export const getAvailableTimeSlots = (shopId, params = {}) => {
    return axios.get(`shops/${shopId}/available-slots/`, { params })
}

export const createBooking = (bookingData) => axios.post('bookings/create/', bookingData)

export const getServiceDuration = (shopId, serviceIds) => {
    return axios.post(`shops/${shopId}/service-duration/`, { services: serviceIds })
}


// Payment APIs
export const createRazorpayOrder = (orderData) => axios.post('payment/razorpay/create-order/', orderData)
export const verifyRazorpayPayment = (verificationData) => axios.post('payment/razorpay/verify/', verificationData)
export const handlePaymentFailure = (failureData) => axios.post('payment/razorpay/failure/', failureData)




// Get all bookings for the shop with optional filters
export const getShopBookings = (params = {}) => {
  const queryParams = new URLSearchParams();
  
  if (params.status && params.status !== 'all') {
    queryParams.append('status', params.status);
  }
  if (params.date) {
    queryParams.append('date', params.date);
  }
  if (params.search) {
    queryParams.append('search', params.search);
  }
  
  const queryString = queryParams.toString();
  const url = queryString ? `shop/bookings/?${queryString}` : 'shop/bookings/';
  
  return axios.get(url);
};

// Update booking status
export const updateBookingStatus = (bookingId, status) => {
  return axios.patch(`shop/bookings/${bookingId}/status/`, { status });
};

// Get booking statistics
export const getBookingStats = () => {
  return axios.get('shop/bookings/stats/');
};


// Get user's bookings
export const getUserBookings = () => axios.get('bookings/')



// Cancel a booking
export const cancelBooking = async (bookingId, reason) => {
  try {
    console.log('API Call - Cancel booking:', { bookingId, reason });
    
    const response = await axios.patch(`bookings/${bookingId}/cancel/`, { 
      reason: reason.trim() 
    });
    
    console.log('API Response - Cancel booking:', response.data);
    return response;
    
  } catch (error) {
    console.error('API Error - Cancel booking:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};



export const getWalletBalance = async () => {
  try {
    const response = await axios.get('/wallet/balance/')
    return response.data
  } catch (error) {
    console.error('Error fetching wallet balance:', error)
    throw error
  }
}

// Get wallet transactions
export const getWalletTransactions = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams()
    
    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.type) queryParams.append('type', params.type)
    
    const response = await axios.get(`/wallet/transactions/?${queryParams.toString()}`)
    return response.data
  } catch (error) {
    console.error('Error fetching wallet transactions:', error)
    throw error
  }
}

// Add money to wallet
export const addMoneyToWallet = async (data) => {
  try {
    const response = await axios.post('/wallet/add-money/', data)
    return response.data
  } catch (error) {
    console.error('Error adding money to wallet:', error)
    throw error
  }
}



