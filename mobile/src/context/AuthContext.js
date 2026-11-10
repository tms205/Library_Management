// mobile/src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginApi, logoutApi } from '../api/authApi';
import { refreshAccessToken } from '../api/client';
import { getUserInfo, isTokenExpired } from '../utils/jwt';
import {
  initPushNotificationForUser,
  unregisterPushNotificationOnLogout,
} from '../services/pushNotificationService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        let token = await AsyncStorage.getItem('accessToken');
        const refreshToken = await AsyncStorage.getItem('refreshToken');

        if (token) {
          // Nếu access token đã hết hạn, thử refresh trước khi vào ứng dụng
          if (isTokenExpired(token)) {
            if (refreshToken) {
              console.log('Mobile Startup: Access token hết hạn, đang tự động refresh token...');
              try {
                token = await refreshAccessToken();
              } catch (refreshErr) {
                console.log('Mobile Startup: Refresh token hết hạn hoặc không hợp lệ -> Cần đăng nhập lại.');
                await AsyncStorage.removeItem('accessToken');
                await AsyncStorage.removeItem('refreshToken');
                token = null;
              }
            } else {
              await AsyncStorage.removeItem('accessToken');
              token = null;
            }
          }

          if (token) {
            setUserToken(token);
            const info = getUserInfo(token);
            setUserInfo(info);
            // Khởi tạo đăng ký push token nếu là Admin/Staff (không chặn luồng nạp phiên)
            try {
              initPushNotificationForUser(info);
            } catch (pushErr) {
              console.log('Mobile Push: Bỏ qua lỗi push token khi khôi phục phiên:', pushErr?.message);
            }
          }
        }
      } catch (e) {
        console.log('Error loading auth from storage:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadStoredAuth();
  }, []);

  const login = async (email, password) => {
    const data = await loginApi(email, password);
    const { accessToken, refreshToken } = data;

    await AsyncStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      await AsyncStorage.setItem('refreshToken', refreshToken);
    }

    setUserToken(accessToken);
    const info = getUserInfo(accessToken);
    setUserInfo(info);

    // Kích hoạt xin quyền và đăng ký device token cho Admin/Staff (không chặn kết quả đăng nhập)
    try {
      initPushNotificationForUser(info);
    } catch (pushErr) {
      console.log('Mobile Push: Bỏ qua lỗi push token khi đăng nhập:', pushErr?.message);
    }

    return data;
  };

  const logout = async () => {
    // Hủy đăng ký device token trên backend trước khi xóa token local
    try {
      await unregisterPushNotificationOnLogout();
    } catch (pushErr) {
      console.log('Mobile Push: Bỏ qua lỗi hủy push token khi đăng xuất:', pushErr?.message);
    }

    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      await logoutApi(refreshToken);
    } catch {}
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    setUserToken(null);
    setUserInfo(null);
  };

  return (
    <AuthContext.Provider
      value={{
        userToken,
        userInfo,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
