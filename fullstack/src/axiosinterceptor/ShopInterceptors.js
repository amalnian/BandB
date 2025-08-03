import axios from "axios";

const BASE_URL = import.meta.env.VITE_SHOP;

const axiosInstance = axios.create({
    baseURL: BASE_URL,
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
                    `${BASE_URL}shop/token/refresh/`,
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
                    throw new Error('Token refresh failed');
                }
            } catch (err) {
                console.error("Token refresh failed:", err);
                processQueue(err, null);
                
                // Clear any stored user data
                localStorage.removeItem("shop_data");
                localStorage.removeItem("user_data");
                
                // Redirect to login
                if (window.location.pathname !== '/shop/login') {
                    window.location.href = "/shop/login";
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