import client from './client';
import axios from 'axios';

export const loginApi = async (email, password) => {
  const response = await client.post('/auth/login', {
    email,
    password,
  });
  return response.data;
};

export const logoutApi = async () => {
  try {
    await client.post('/auth/logout');
  } catch (err) {
    console.log('Logout API error:', err);
  }
};

export const registerApi = async (data) => {
  const response = await client.post('/auth/register', data);
  return response.data;
};

export const forgotPasswordApi = async (email) => {
  const response = await client.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPasswordApi = async (email, otp, newPassword) => {
  const response = await client.post('/auth/reset-password', {
    email,
    otp,
    newPassword,
  });
  return response.data;
};

export const changePasswordApi = async (oldPassword, newPassword) => {
  const response = await client.put('/auth/change-password', {
    oldPassword,
    newPassword,
  });
  return response.data;
};

export const requestChangeEmailApi = async (newEmail) => {
  const response = await client.post('/auth/change-email/request', { newEmail });
  return response.data;
};

export const confirmChangeEmailApi = async (code) => {
  const response = await client.post('/auth/change-email/confirm', { code });
  return response.data;
};

export const pingServer = async (baseUrl) => {
  try {
    const res = await axios.get(`${baseUrl}/swagger-ui/index.html`, {
      timeout: 4000,
    });
    return res.status === 200;
  } catch (err) {
    if (err.response) return true;
    return false;
  }
};
