// mobile/src/api/client.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../config';
import { isTokenExpired } from '../utils/jwt';

const client = axios.create({
  timeout: 15000,
});

let refreshPromise = null;

/**
 * Gọi API refresh token để lấy access token mới
 */
export const refreshAccessToken = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = await AsyncStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('Không có refresh token!');
  }

  const baseUrl = await getBaseUrl();

  refreshPromise = axios
    .post(`${baseUrl}/auth/refresh`, {
      refreshToken,
    })
    .then(async (response) => {
      const newAccessToken = response.data?.accessToken;
      const newRefreshToken = response.data?.refreshToken;

      if (!newAccessToken) {
        throw new Error('Không nhận được access token mới từ máy chủ!');
      }

      await AsyncStorage.setItem('accessToken', newAccessToken);
      if (newRefreshToken) {
        await AsyncStorage.setItem('refreshToken', newRefreshToken);
      }

      console.log('Mobile: Refresh access token thành công!');
      return newAccessToken;
    })
    .catch(async (error) => {
      console.log('Mobile: Refresh token thất bại:', error.response?.status, error.message);
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

// ==========================================
// REQUEST INTERCEPTOR: Chủ động kiểm tra hạn token trước khi gửi
// ==========================================
client.interceptors.request.use(
  async (config) => {
    const baseUrl = await getBaseUrl();
    config.baseURL = baseUrl;

    let accessToken = await AsyncStorage.getItem('accessToken');

    // Nếu có token nhưng đã hết hạn, chủ động refresh trước
    if (accessToken && isTokenExpired(accessToken)) {
      try {
        console.log('Mobile: Token sắp/đã hết hạn, đang chủ động refresh trước khi gửi request...');
        accessToken = await refreshAccessToken();
      } catch (refreshErr) {
        console.log('Mobile: Không thể chủ động refresh token:', refreshErr.message);
        // Để request tiếp tục, nếu server trả 401/403 thì response interceptor sẽ xử lý
      }
    }

    if (accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ==========================================
// RESPONSE INTERCEPTOR: Xử lý cả 401 và 403 (Spring Security trả 403 khi JWT hết hạn)
// ==========================================
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Chỉ can thiệp nếu là lỗi xác thực (401 hoặc 403)
    if (status !== 401 && status !== 403) {
      return Promise.reject(error);
    }

    // Tránh vòng lặp vô hạn nếu đã retry 1 lần
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    const authHeader =
      originalRequest.headers?.Authorization || originalRequest.headers?.authorization;
    const requestToken =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : null;

    const currentToken = await AsyncStorage.getItem('accessToken');

    /*
     * Trường hợp 1: Token của request này cũ hơn token hiện có trong storage
     * (do request khác vừa refresh thành công) -> Dùng token mới retry ngay
     */
    if (
      requestToken &&
      currentToken &&
      requestToken !== currentToken &&
      !isTokenExpired(currentToken)
    ) {
      originalRequest._retry = true;
      originalRequest.headers.Authorization = `Bearer ${currentToken}`;
      return client(originalRequest);
    }

    /*
     * Trường hợp 2: Token vẫn còn hạn nhưng backend trả 403:
     * Đây là trường hợp tài khoản thực sự thiếu quyền (ví dụ: USER gọi duyệt mượn, sửa sách, bật bảo trì).
     * Tuyệt đối không refresh token làm lãng phí request.
     */
    if (status === 403 && requestToken && !isTokenExpired(requestToken)) {
      console.log('Mobile: Token hợp lệ nhưng bị 403 -> Tài khoản không có quyền truy cập endpoint này!');
      return Promise.reject(error);
    }

    /*
     * Trường hợp 3: Token đã hết hạn hoặc server trả 401/403 do chưa xác thực -> Thử refresh token
     */
    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return client(originalRequest);
    } catch (refreshError) {
      console.log('Mobile: Thử refresh token sau khi nhận lỗi 401/403 thất bại.');
      return Promise.reject(error);
    }
  },
);

export default client;
