import axios from '../axiosinterceptor/UserInterceptor'
axios.defaults.withCredentials = true;

export const login = (formBody) => axios.post("token/", formBody)

export const logout = () => axios.post('logout/', {})

// Password Reset APIs
export const forgotPassword = (email) => axios.post('forgot-password/', { email })

export const verifyForgotOtp = (formBody) => axios.post('verify-forgot-password-otp/', formBody)

export const resetPassword = (formBody) => axios.post('reset-password/', formBody)