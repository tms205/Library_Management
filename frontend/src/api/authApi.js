import { API_BASE_URL } from './config';
import axios from 'axios';
const publicClient = axios.create({ timeout: 20000 });

const API_URL = `${API_BASE_URL}/auth`;

export const login = (data) => {
  return publicClient.post(`${API_URL}/login`, data);
};

export const register = (data) => {
  return publicClient.post(`${API_URL}/register`, data);
};

export const forgotPassword = (data) => {
  return publicClient.post(`${API_URL}/forgot-password`, data);
};

export const resetPassword = (data) => {
  return publicClient.post(`${API_URL}/reset-password`, data);
};

export const verifyEmail = (token) => {
  return publicClient.get(`${API_URL}/verify-email`, {
    params: {
      token: token,
    },
  });
};

export const verifyEmailOtp = (email, otp) => {
  return publicClient.post(`${API_URL}/verify-email-otp`, { email, otp });
};

export const resendVerification = (email) => {
  return publicClient.post(`${API_URL}/resend-verification`, null, { params: { email } });
};