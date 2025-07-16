import axios from '../axiosinterceptor/AdminInterceptor';
axios.defaults.withCredentials = true;

// Authentication APIs
export const login = (formBody) => axios.post('token/', formBody);
export const logout = () => axios.post("logout/");
export const refreshToken = () => axios.post("token/refresh/");

// Dashboard APIs
// export const getDashboardStats = () => axios.get("dashboard/stats/");
export const getRecentAppointments = () => axios.get("dashboard/appointments/");

// Customer APIs
export const getCustomers = () => axios.get("customers/");
export const getCustomer = (id) => axios.get(`customers/${id}/`);
export const createCustomer = (data) => axios.post("customers/", data);
export const updateCustomer = (id, data) => axios.put(`customers/${id}/`, data);
export const deleteCustomer = (id) => axios.delete(`customers/${id}/`);

// Appointment APIs
export const getAppointments = () => axios.get("appointments/");
export const getAppointment = (id) => axios.get(`appointments/${id}/`);
export const createAppointment = (data) => axios.post("appointments/", data);
export const updateAppointment = (id, data) => axios.put(`appointments/${id}/`, data);
export const deleteAppointment = (id) => axios.delete(`appointments/${id}/`);

// Service APIs
export const getServices = () => axios.get("services/");
export const getService = (id) => axios.get(`services/${id}/`);
export const createService = (data) => axios.post("services/", data);
export const updateService = (id, data) => axios.put(`services/${id}/`, data);
export const deleteService = (id) => axios.delete(`services/${id}/`);

// Product APIs
export const getProducts = () => axios.get("products/");
export const getProduct = (id) => axios.get(`products/${id}/`);
export const createProduct = (data) => axios.post("products/", data);
export const updateProduct = (id, data) => axios.put(`products/${id}/`, data);
export const deleteProduct = (id) => axios.delete(`products/${id}/`);

// Shop APIs - FIXED VERSION
export const getShops = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page);
  if (params.search) queryParams.append('search', params.search);
  
  const queryString = queryParams.toString();
  // Fixed: Add proper query parameter separator
  return axios.get(`shops/${queryString ? '?' + queryString : ''}`);
};

// Alternative cleaner approach:
export const getShopsAlternative = (params = {}) => {
  return axios.get('shops/', { params });
};

export const getShop = (id) => axios.get(`shops/${id}/`);
export const createShop = (data) => axios.post("shops/", data);
export const updateShop = (id, data) => axios.put(`shops/${id}/`, data);
export const deleteShop = (id) => axios.delete(`shops/${id}/`);

// Shop status management
export const toggleShopStatus = (id, statusData) => 
  axios.patch(`shops/${id}/toggle_status/`, statusData);

export const approveShop = (id, approvalData) => 
  axios.patch(`shops/${id}/approve/`, approvalData);

export const blockShop = (id) => 
  axios.patch(`shops/${id}/toggle_status/`, { is_active: false });

export const unblockShop = (id) => 
  axios.patch(`shops/${id}/toggle_status/`, { is_active: true });


// User APIs
export const getUsers = () => axios.get("users/");
export const getUser = (id) => axios.get(`users/${id}/`);
export const createUser = (data) => axios.post("users/", data);
export const updateUser = (id, data) => axios.put(`users/${id}/`, data);
export const deleteUser = (id) => axios.delete(`users/${id}/`);

// User status management
export const toggleUserStatus = (id, statusData) => 
  axios.patch(`users/${id}/toggle_status/`, statusData);





export const getAdminProfile = () => axios.get('settings/profile/');

export const updateAdminProfile = (formData) => axios.put('settings/profile/', formData);

export const changeAdminPassword = (passwordData) => axios.post('settings/change-password/', passwordData);







export const getDashboardStats = (dateRange) => 
    axios.get('dashboard/stats/', { 
        params: dateRange 
    });

export const getRevenueChart = (chartType) => 
    axios.get('dashboard/revenue-chart/', { 
        params: { type: chartType } 
    });

export const getShopsPerformance = (dateRange) => 
    axios.get('dashboard/shops-performance/', { 
        params: dateRange 
    });

export const getRecentBookings = (limit = 10) => 
    axios.get('dashboard/recent-bookings/', { 
        params: { limit } 
    });

export const getCommissionReport = (dateRange) => 
    axios.get('dashboard/commission-report/', { 
        params: dateRange 
    });

// Additional admin features
export const payShopCommission = (shopId, amount) => 
    axios.post('dashboard/pay-shop/', { 
        shop_id: shopId, 
        amount: amount 
    });

export const exportData = (exportType) => 
    axios.get('dashboard/export/', { 
        params: { type: exportType },
        responseType: 'blob' // Important for file downloads
    });