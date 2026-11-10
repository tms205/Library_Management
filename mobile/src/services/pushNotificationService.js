// mobile/src/services/pushNotificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { isRunningInExpoGo } from 'expo';
import Constants, { AppOwnership, ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerDeviceTokenApi, unregisterDeviceTokenApi } from '../api/notificationApi';

const FCM_TOKEN_STORAGE_KEY = '@library_fcm_device_token';

let hasLoggedExpoGoNotice = false;

/**
 * Kiểm tra chính xác xem ứng dụng có đang chạy trong Expo Go hay không
 */
export const isExpoGo = () => {
  try {
    // 1. Kiểm tra chính thức bằng API của Expo SDK 58
    if (typeof isRunningInExpoGo === 'function' && isRunningInExpoGo()) {
      return true;
    }
  } catch {
    // ignore
  }

  try {
    // 2. Kiểm tra qua expo-constants (AppOwnership.Expo === 'expo')
    // Trong Expo Go, appOwnership luôn là 'expo'.
    // Trong Development Build (expo-dev-client), appOwnership là 'guest' hoặc undefined.
    if (Constants?.appOwnership === 'expo' || Constants?.appOwnership === AppOwnership?.Expo) {
      return true;
    }
  } catch {
    // ignore
  }

  try {
    // 3. Fallback qua executionEnvironment
    if (
      Constants?.executionEnvironment === ExecutionEnvironment?.StoreClient &&
      Constants?.appOwnership === 'expo'
    ) {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
};

/**
 * Kiểm tra xem môi trường hiện tại có hỗ trợ Remote Push Notification (FCM) hay không.
 * Từ Expo SDK 53, Expo Go trên Android không còn hỗ trợ remote push (sẽ throw Error nếu gọi).
 * Chức năng này chỉ hoạt động trên Development Build hoặc Standalone App có cấu hình google-services.json.
 */
export const isRemotePushSupported = () => {
  if (Platform.OS === 'web') return false;

  // Nếu đang chạy trong Expo Go trên Android hoặc iOS
  if (isExpoGo()) {
    if (__DEV__ && !hasLoggedExpoGoNotice) {
      hasLoggedExpoGoNotice = true;
      console.log('Remote Push Notification is unavailable in Expo Go on Android. Use a development build.');
    }
    return false;
  }

  return true;
};

// Cấu hình hiển thị thông báo khi ứng dụng đang mở (Foreground) - chỉ chạy khi remote push được hỗ trợ
if (isRemotePushSupported()) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (err) {
    console.log('Mobile Push: Error setting notification handler:', err?.message);
  }
}

/**
 * Thiết lập kênh thông báo ưu tiên cao cho Android (Android Notification Channel)
 */
export const setupNotificationChannelsAsync = async () => {
  if (Platform.OS === 'android' && isRemotePushSupported()) {
    try {
      await Notifications.setNotificationChannelAsync('library_borrow_channel', {
        name: 'Yêu cầu mượn sách',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366f1',
        sound: 'default',
        showBadge: true,
      });
    } catch (err) {
      console.log('Mobile Push: Error setting notification channel:', err?.message);
    }
  }
};

/**
 * Xin quyền và lấy Android Native FCM Registration Token
 */
export const registerForPushNotificationsAsync = async () => {
  if (!isRemotePushSupported()) {
    return null;
  }

  await setupNotificationChannelsAsync();

  if (!Device.isDevice) {
    console.log('Mobile Push: Thiết bị máy ảo có thể không nhận được Push Notification trực tiếp.');
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Mobile Push: Người dùng đã từ chối cấp quyền thông báo.');
      return null;
    }

    // Lấy Native FCM Token trên Android (tương thích trực tiếp với Firebase Admin SDK)
    const tokenResponse = await Notifications.getDevicePushTokenAsync();
    const token = tokenResponse?.data;

    console.log('Mobile Push: Lấy FCM Registration Token thành công:', token);
    return token;
  } catch (error) {
    console.log('Mobile Push: Không thể lấy FCM Token (Cần google-services.json & Development Build):', error?.message);
    return null;
  }
};

/**
 * Đăng ký token thiết bị lên Backend cho tài khoản người dùng (Độc giả, Thủ thư, Quản trị viên)
 */
export const initPushNotificationForUser = async (userInfo) => {
  if (!userInfo || !isRemotePushSupported()) return;

  try {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      await registerDeviceTokenApi(token, Platform.OS);
      await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
      console.log('Mobile Push: Đã gửi và liên kết FCM token với tài khoản thành công!');
    }
  } catch (err) {
    console.log('Mobile Push: Lỗi gửi token lên backend:', err?.message);
  }
};

/**
 * Hủy liên kết FCM token khi người dùng đăng xuất khỏi ứng dụng
 */
export const unregisterPushNotificationOnLogout = async () => {
  if (!isRemotePushSupported()) return;

  try {
    const savedToken = await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    if (savedToken) {
      await unregisterDeviceTokenApi(savedToken);
      await AsyncStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
      console.log('Mobile Push: Đã hủy liên kết FCM token khỏi thiết bị.');
    }
  } catch (err) {
    console.log('Mobile Push: Lỗi khi hủy đăng ký FCM token:', err?.message);
  }
};

/**
 * Lắng nghe sự kiện hệ điều hành làm mới FCM Device Token (Token Rotation)
 */
export const listenForTokenRefreshAsync = () => {
  if (!isRemotePushSupported()) {
    return { remove: () => {} };
  }

  try {
    return Notifications.addPushTokenListener(async (tokenResponse) => {
      try {
        const newToken = tokenResponse?.data;
        if (newToken) {
          console.log('Mobile Push: Token refreshed by Firebase:', newToken);
          await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, newToken);
          await registerDeviceTokenApi(newToken, Platform.OS);
        }
      } catch (err) {
        console.log('Mobile Push: Error updating refreshed token:', err?.message);
      }
    });
  } catch (err) {
    console.log('Mobile Push: Error setting token refresh listener:', err?.message);
    return { remove: () => {} };
  }
};

/**
 * Lắng nghe sự kiện người dùng nhấn vào thông báo (Foreground, Background, Terminated)
 * Tự động điều hướng an toàn tới màn hình Quản lý mượn trả
 */
export const setupNotificationNavigationListener = (navigationRef) => {
  if (!isRemotePushSupported()) {
    return () => {};
  }

  try {
    // 1. Khi người dùng nhấn vào thông báo khi app đang chạy hoặc chạy nền
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      handleNotificationRedirect(data, navigationRef);
    });

    // 2. Khi ứng dụng khởi động từ trạng thái đã đóng hoàn toàn (Cold Start / Terminated)
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          const data = response?.notification?.request?.content?.data;
          handleNotificationRedirect(data, navigationRef);
        }
      })
      .catch((err) => {
        console.log('Mobile Push: Error reading last notification response:', err?.message);
      });

    // 3. Lắng nghe cập nhật khi FCM refresh token tự động
    const tokenRefreshSubscription = listenForTokenRefreshAsync();

    return () => {
      try {
        responseSubscription?.remove?.();
        tokenRefreshSubscription?.remove?.();
      } catch (e) {
        // ignore cleanup error
      }
    };
  } catch (err) {
    console.log('Mobile Push: Error in setupNotificationNavigationListener:', err?.message);
    return () => {};
  }
};

const handleNotificationRedirect = (data, navigationRef) => {
  if (!data || !navigationRef?.isReady?.()) return;

  try {
    const state = navigationRef.getRootState();
    const isAuthRoutePresent = state?.routeNames?.includes('Main');
    if (!isAuthRoutePresent) {
      console.log('Mobile Push: Screen BorrowManageTab is inaccessible because user is unauthenticated.');
      return;
    }

    if (data.type === 'BORROW_APPROVED' || data.screen === 'MyBooksTab') {
      navigationRef.navigate('Main', {
        screen: 'MyBooksTab',
        params: {
          status: 'BORROWED',
          borrowRecordId: data.borrowRecordId,
        },
      });
    } else if (data.type === 'RETURN_REQUEST') {
      navigationRef.navigate('Main', {
        screen: 'BorrowManageTab',
        params: {
          status: 'RETURN_PENDING',
          borrowRecordId: data.borrowRecordId,
        },
      });
    } else if (data.screen === 'BorrowManageTab' || data.type === 'BORROW_REQUEST') {
      navigationRef.navigate('Main', {
        screen: 'BorrowManageTab',
        params: { status: 'PENDING' },
      });
    }
  } catch (e) {
    console.log('Mobile Push: Navigation redirect error:', e.message);
  }
};
