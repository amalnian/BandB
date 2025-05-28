import axios from '../axiosinterceptor/UserInterceptor'
axios.defaults.withCredentials = true;

export const login = (formBody) => axios.post("token/",
    formBody,
)

export const logout = () => axios.post(
    'logout/',
    {}
)