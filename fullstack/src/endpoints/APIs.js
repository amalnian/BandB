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

// Barber Shop APIs
export const getBarbers = (params = {}) => {
  // Add query parameters for filtering, sorting, pagination
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 20,
    sort_by: params.sort_by || 'rating', // rating, distance, name, price
    order: params.order || 'desc',
    status: 'approved' // Only get approved barber shops
  }).toString();
  
  return axios.get(`barber-shops/?${queryParams}`);
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

export const createBooking = (bookingData) => {
  return axios.post('bookings/', {
    barber_shop_id: bookingData.barber_shop_id,
    service_ids: bookingData.service_ids,
    booking_date: bookingData.booking_date,
    booking_time: bookingData.booking_time,
    notes: bookingData.notes
  });
};

export const getUserBookings = (params = {}) => {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 10,
    status: params.status || 'all' // upcoming, completed, cancelled, all
  }).toString();
  
  return axios.get(`user/bookings/?${queryParams}`);
};

export const cancelBooking = (bookingId, reason) => {
  return axios.patch(`bookings/${bookingId}/cancel/`, { reason });
};

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

// Alternative: Combined function that handles both location update and nearby search
export const searchNearbyShops = (locationData) => 
  axios.post('shops/search-nearby/', locationData)