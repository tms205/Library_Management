// mobile/src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginApi, logoutApi } from '../api/authApi';
import { refreshAccessToken } from '../api/client';
import { getUserInfo, isTokenExpired } from '../utils/jwt';

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
    return data;
  };

  const logout = async () => {
    try {
      await logoutApi();
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
