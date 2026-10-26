import axios from 'axios';

const BASE_URL = 'http://localhost:8080';

const axiosClient = axios.create({
  baseURL: BASE_URL,
});

// Dùng chung 1 Promise khi nhiều request cùng cần refresh
let refreshPromise = null;

// ========================================================
// KIEM TRA ACCESS TOKEN HET HAN
// ========================================================

const isTokenExpired = (token) => {
  try {
    if (!token) {
      return true;
    }

    const parts = token.split('.');

    if (parts.length !== 3) {
      return true;
    }

    let payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');

    payloadBase64 += '='.repeat((4 - (payloadBase64.length % 4)) % 4);

    const payload = JSON.parse(atob(payloadBase64));

    if (!payload.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);

    // Trừ hao 10 giây để chủ động refresh trước khi token hết hạn thực tế
    return payload.exp <= now + 10;
  } catch (error) {
    console.error('Không đọc được access token:', error);

    return true;
  }
};

// ========================================================
// LOGOUT
// ========================================================

const logoutAndRedirect = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');

  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// ========================================================
// REFRESH TOKEN
// ========================================================

const refreshAccessToken = async () => {
  // Nếu request khác đang refresh thì dùng chung Promise đó
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = localStorage.getItem('refreshToken');

  if (!refreshToken) {
    throw new Error('Không có refresh token!');
  }

  refreshPromise = axios
    .post(`${BASE_URL}/auth/refresh`, {
      refreshToken: refreshToken,
    })
    .then((response) => {
      const newAccessToken = response.data?.accessToken;

      const newRefreshToken = response.data?.refreshToken;

      if (!newAccessToken) {
        throw new Error('Không nhận được access token mới!');
      }

      localStorage.setItem('accessToken', newAccessToken);

      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
      }

      console.log('Refresh access token thành công!');

      return newAccessToken;
    })
    .finally(() => {
      // Quan trọng:
      // cho phép lần hết hạn tiếp theo refresh tiếp
      refreshPromise = null;
    });

  return refreshPromise;
};

// ========================================================
// REQUEST INTERCEPTOR
// ========================================================

axiosClient.interceptors.request.use(
  async (config) => {
    let accessToken = localStorage.getItem('accessToken');

    // API không cần token
    if (!accessToken) {
      return config;
    }

    /*
     * Nếu token đã hết hạn:
     * refresh TRƯỚC khi gửi request lên backend.
     */
    if (isTokenExpired(accessToken)) {
      try {
        accessToken = await refreshAccessToken();
      } catch (refreshError) {
        console.error(
          'Refresh token thất bại:',
          refreshError.response?.status,
          refreshError.response?.data || refreshError.message,
        );

        logoutAndRedirect();

        return Promise.reject(refreshError);
      }
    }

    config.headers = config.headers || {};

    config.headers.Authorization = `Bearer ${accessToken}`;

    return config;
  },

  (error) => {
    return Promise.reject(error);
  },
);

// ========================================================
// RESPONSE INTERCEPTOR
// ========================================================

axiosClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Không phải lỗi Authentication / Authorization
    if (status !== 401 && status !== 403) {
      return Promise.reject(error);
    }

    // Đã retry rồi thì không retry vô hạn
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    const authorizationHeader =
      originalRequest.headers?.Authorization || originalRequest.headers?.authorization;

    const requestAccessToken = authorizationHeader?.startsWith('Bearer ')
      ? authorizationHeader.substring(7)
      : null;

    const currentAccessToken = localStorage.getItem('accessToken');

    /*
     * Request cũ đang dùng token cũ,
     * nhưng request khác đã refresh thành công.
     *
     * => retry bằng token mới.
     */
    if (
      requestAccessToken &&
      currentAccessToken &&
      requestAccessToken !== currentAccessToken &&
      !isTokenExpired(currentAccessToken)
    ) {
      originalRequest._retry = true;

      originalRequest.headers.Authorization = `Bearer ${currentAccessToken}`;

      return axiosClient(originalRequest);
    }

    /*
     * Token còn hạn nhưng backend trả 403:
     * đây là thiếu permission thật.
     *
     * VD:
     * STAFF gọi DELETE BOOK.
     *
     * Không refresh.
     */
    if (status === 403 && requestAccessToken && !isTokenExpired(requestAccessToken)) {
      return Promise.reject(error);
    }

    /*
     * Token hết hạn hoặc bị 401:
     * thử refresh một lần.
     */
    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();

      originalRequest.headers = originalRequest.headers || {};

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return axiosClient(originalRequest);
    } catch (refreshError) {
      console.error(
        'REFRESH TOKEN THẤT BẠI:',
        refreshError.response?.status,
        refreshError.response?.data || refreshError.message,
      );

      logoutAndRedirect();

      return Promise.reject(refreshError);
    }
  },
);

export default axiosClient;
