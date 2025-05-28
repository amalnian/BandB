import axios from "axios";
const BASE_URL = 'http://localhost:8000/api/';
const axiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true
});

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                await axios.post(
                    `${BASE_URL}token/refresh/`,
                    {},
                    { withCredentials: true }
                )
                return axiosInstance(originalRequest)
            } catch (err) {
                console.error("Token refresh failed:", err);
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
)

export default axiosInstance