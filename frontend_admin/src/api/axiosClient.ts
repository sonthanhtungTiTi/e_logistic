import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_ADMIN_API_URL) {
    return import.meta.env.VITE_ADMIN_API_URL;
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:5000/api`;
};

// ── Tự động xóa mock token cũ nếu còn kẹt trong localStorage ──────────────────
// Token thật từ backend là JWT (3 segment ngăn cách bằng dấu chấm, bắt đầu bằng "ey")
// Token mock "mock_admin_jwt_token_889922" không có định dạng này → xóa ngay.
const storedToken = localStorage.getItem('admin_access_token');
if (storedToken && !storedToken.startsWith('ey')) {
  localStorage.removeItem('admin_access_token');
  localStorage.removeItem('admin_user_profile');
  console.info('[Auth] Đã xóa mock token cũ. Vui lòng đăng nhập lại.');
}

export const axiosClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export const axiosAdminClient = axiosClient;

axiosClient.interceptors.request.use(
  (config) => {
    config.baseURL = getBaseURL();
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
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
