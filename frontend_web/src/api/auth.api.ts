import axiosClient from './axiosClient';

export const authApi = {
  login: (data: { email?: string; identifier?: string; password: string }) =>
    axiosClient.post('/auth/login', data),
  register: (data: Record<string, unknown>) =>
    axiosClient.post('/auth/register', data),
  sendRegisterOtp: (email: string) =>
    axiosClient.post('/auth/send-register-otp', { email }),
  verifyRegisterOtp: (data: { email: string; otp: string }) =>
    axiosClient.post('/auth/verify-register-otp', data),
  forgotPassword: (identifier: string) =>
    axiosClient.post('/auth/forgot-password', { identifier }),
  verifyOtp: (data: { userId: string; otp: string }) =>
    axiosClient.post('/auth/verify-otp', data),
  resetPassword: (data: { userId: string; newPassword: string; confirmNewPassword: string }) =>
    axiosClient.post('/auth/reset-password', data),
  getProfile: () =>
    axiosClient.get('/auth/profile'),
  updateProfile: (data: Record<string, unknown>) =>
    axiosClient.put('/auth/profile', data),
  changePassword: (data: Record<string, unknown>) =>
    axiosClient.put('/auth/change-password', data),
};
