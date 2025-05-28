// Updated ShopAPI.js
import axios from '../axiosinterceptor/ShopInterceptors';
axios.defaults.withCredentials = true;

// Authentication APIs
export const shoplogin = (formBody) => axios.post('shop/token/', formBody);

export const logout = () => axios.post("shop/logout/");

export const refreshToken = () => axios.post("shop/token/refresh/");

// Shop Profile APIs
export const getShopProfile = () => axios.get("shop/profile/");

export const updateShopProfile = (shopData) => axios.post("shop/update/", shopData);

// Dashboard APIs
export const getDashboardStats = () => axios.get("dashboard/stats/");

export const getRecentAppointments = () => axios.get("appointments/recent/");

export const getNotifications = () => axios.get("notifications/");

// Business Hours APIs (Missing in your original file)
export const getBusinessHours = () => axios.get("shop/business-hours/");

export const updateBusinessHours = (businessHours) => axios.post("shop/business-hours/update/", { business_hours: businessHours });

// Special Closing Days APIs (Missing in your original file)
export const getSpecialClosingDays = () => axios.get("shop/special-closing-days/");

export const addSpecialClosingDay = (closingDayData) => axios.post("shop/special-closing-days/add/", closingDayData);

export const removeSpecialClosingDay = (id) => axios.delete(`shop/special-closing-days/remove/${id}/`);

// Appointments APIs
export const getAllAppointments = () => axios.get("appointments/");

export const createAppointment = (appointmentData) => axios.post("appointments/", appointmentData);

export const updateAppointment = (id, appointmentData) => axios.put(`appointments/${id}/`, appointmentData);

export const deleteAppointment = (id) => axios.delete(`appointments/${id}/`);

// Services APIs
export const getServices = () => axios.get("services/");

export const createService = (serviceData) => axios.post("services/", serviceData);

export const updateService = (id, serviceData) => axios.put(`services/${id}/`, serviceData);

export const deleteService = (id) => axios.delete(`services/${id}/`);

// Customers APIs
export const getCustomers = () => axios.get("customers/");

export const getCustomerDetails = (id) => axios.get(`customers/${id}/`);

// Reports APIs
export const getReports = (params) => axios.get("reports/", { params });

export const getAnalytics = (params) => axios.get("analytics/", { params });

// Notifications APIs
export const markNotificationAsRead = (id) => axios.put(`notifications/${id}/read/`);

export const markAllNotificationsAsRead = () => axios.put("notifications/mark-all-read/");

// Shop Status/Approval APIs (You might need these)
export const getShopStatus = () => axios.get("shop/status/");

export const requestApproval = () => axios.post("shop/request-approval/");

// Generic API helper for any other endpoints
export const apiCall = {
    get: (endpoint, params) => axios.get(endpoint, { params }),
    post: (endpoint, data) => axios.post(endpoint, data),
    put: (endpoint, data) => axios.put(endpoint, data),
    delete: (endpoint) => axios.delete(endpoint)
};