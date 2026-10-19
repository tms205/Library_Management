import axios from 'axios';

const API_URL = 'http://localhost:8080/auth';

export const login = (data) => {
  return axios.post(`${API_URL}/login`, data);
};

export const register = (data) => {
  return axios.post(`${API_URL}/register`, data);
};

export const forgotPassword = (data) => {
  return axios.post(`${API_URL}/forgot-password`, data);
};

export const resetPassword = (data) => {
  return axios.post(`${API_URL}/reset-password`, data);
};

export const verifyEmail = (token) => {
  return axios.get(`${API_URL}/verify-email`, {
    params: {
      token: token,
    },
  });
};