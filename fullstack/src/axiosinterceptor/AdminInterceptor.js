import axios from "axios";

const ADMINBASE_URL = 'http://localhost:8000/api/admin/';

const axiosInstance = axios.create({
    baseURL: ADMINBASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    
    failedQueue = [];
};

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // If already refreshing, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => {
                    return axiosInstance(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const response = await axios.post(
                    `${ADMINBASE_URL}token/refresh/`,
                    {},
                    { 
                        withCredentials: true,
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    }
                );

                if (response.data.success) {
                    processQueue(null, response.data);
                    return axiosInstance(originalRequest);
                } else {
                    throw new Error(response.data.message || 'Token refresh failed');
                }
            } catch (err) {
                console.error("Admin token refresh failed:", err);
                
                // Check if it's a session expired error
                const errorMessage = err.response?.data?.message || err.message;
                if (errorMessage.includes('Session expired') || errorMessage.includes('blacklisted')) {
                    console.log("Admin session expired, redirecting to login");
                }
                
                processQueue(err, null);
                
                // Clear any stored admin data
                localStorage.removeItem("admin_data");
                localStorage.removeItem("user_data");
                
                // Redirect to admin login
                if (window.location.pathname !== '/admin/login') {
                    window.location.href = "/admin/login";
                }
                
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }
        
        return Promise.reject(error);
    }
);

export default axiosInstance;