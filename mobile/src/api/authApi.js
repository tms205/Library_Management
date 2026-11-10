import client from './client';
import axios from 'axios';

export const loginApi = async (email, password) => {
  const response = await client.post('/auth/login', {
    email,
    password,
  });
  return response.data;
};

export const logoutApi = async (refreshToken) => {
  try {
    await client.post('/auth/logout', { refreshToken: refreshToken || '' });
  } catch (err) {
    console.log('Logout API error:', err);
  }
};

export const registerApi = async (data) => {
  const response = await client.post('/auth/register', data);
  return response.data;
};

export const verifyEmailOtpApi = async (email, otp) => {
  const response = await client.post('/auth/verify-email-otp', {
    email,
    otp,
  });
  return response.data;
};

export const resendVerificationApi = async (email) => {
  const response = await client.post('/auth/resend-verification', null, {
    params: { email },
  });
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
    let url = (baseUrl || '').trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    while (url.endsWith('/')) {
      url = url.slice(0, -1);
    }

    const res = await axios.get(`${url}/swagger-ui/index.html`, {
      timeout: 5000,
      validateStatus: () => true, // chấp nhận mọi status code trả về từ server
    });

    return {
      ok: true,
      status: res.status,
      message: `Kết nối máy chủ thành công (HTTP ${res.status})!`,
      url,
    };
  } catch (err) {
    if (err.response) {
      // Có response trả về từ Spring Boot (kể cả 403 từ Spring Security) -> Máy chủ online!
      return {
        ok: true,
        status: err.response.status,
        message: `Máy chủ phản hồi (HTTP ${err.response.status})!`,
      };
    }

    const errMsg = err.message || '';
    if (errMsg.toLowerCase().includes('cleartext')) {
      return {
        ok: false,
        message: 'Lỗi Android: Giao thức HTTP không mã hóa (Cleartext) bị chặn bởi hệ thống.',
      };
    }
    if (errMsg.toLowerCase().includes('timeout') || err.code === 'ECONNABORTED') {
      return {
        ok: false,
        message: 'Quá thời gian kết nối (Timeout). Vui lòng kiểm tra điện thoại và máy chủ có cùng mạng Wi-Fi không.',
      };
    }

    return {
      ok: false,
      message: `Không phản hồi: ${errMsg || 'Kiểm tra lại IP hoặc cùng Wi-Fi'}`,
    };
  }
};
