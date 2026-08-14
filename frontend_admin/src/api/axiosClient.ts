import axios from 'axios';

const baseURL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:5000/api';

export const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const axiosAdminClient = axiosClient;

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_access_token') || localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('admin_user_profile');
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
