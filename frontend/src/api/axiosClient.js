import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://localhost:8080',
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, newAccessToken = null) => {
  failedQueue.forEach((request) => {
    if (error) {
      request.reject(error);
    } else {
      request.resolve(newAccessToken);
    }
  });

  failedQueue = [];
};

const isTokenExpired = (token) => {
  try {
    if (!token) {
      return true;
    }

    const payloadBase64 = token.split('.')[1];

    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));

    const payload = JSON.parse(payloadJson);

    if (!payload.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);

    return payload.exp <= now;
  } catch (error) {
    console.error('Không đọc được access token:', error);

    return true;
  }
};

// =========================
// REQUEST
// =========================

axiosClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  },
);

// =========================
// RESPONSE
// =========================

axiosClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    const status = error.response?.status;

    const accessToken = localStorage.getItem('accessToken');

    const refreshToken = localStorage.getItem('refreshToken');

    const authError = status === 401 || status === 403;

    // Không phải lỗi auth
    if (!authError) {
      return Promise.reject(error);
    }

    // 403 do thiếu permission thật
    // chứ token chưa hết hạn
    if (accessToken && !isTokenExpired(accessToken)) {
      return Promise.reject(error);
    }

    // Request này đã thử refresh rồi
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // Không còn refresh token
    if (!refreshToken) {
      logoutAndRedirect();

      return Promise.reject(error);
    }

    // Nếu đang có 1 request khác refresh
    // thì request này đứng chờ
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve,
          reject,
        });
      }).then((newAccessToken) => {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return axiosClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Dùng axios thường để tránh interceptor lặp
      const response = await axios.post('http://localhost:8080/auth/refresh', {
        refreshToken: refreshToken,
      });

      const newAccessToken = response.data.accessToken;

      const newRefreshToken = response.data.refreshToken;

      if (!newAccessToken) {
        throw new Error('Không nhận được access token mới!');
      }

      localStorage.setItem('accessToken', newAccessToken);

      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
      }

      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      // Gửi lại request vừa bị lỗi
      return axiosClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);

      logoutAndRedirect();

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

const logoutAndRedirect = () => {
  localStorage.removeItem('accessToken');

  localStorage.removeItem('refreshToken');

  window.location.href = '/login';
};

export default axiosClient;
