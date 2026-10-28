import AsyncStorage from '@react-native-async-storage/async-storage';

// =========================================================================
// CẤU HÌNH ĐỊA CHỈ MÁY CHỦ CHO ỨNG DỤNG DI ĐỘNG (MOBILE)
//
// LƯU Ý QUAN TRỌNG:
// - Điện thoại (cả máy thật lẫn máy ảo) KHÔNG THỂ dùng 'localhost' hoặc '127.0.0.1'
//   vì 'localhost' trên điện thoại là chính bản thân chiếc điện thoại đó!
// - Bắt buộc phải dùng IP mạng Wi-Fi nội bộ (LAN) của máy tính chạy Spring Boot
// - Cổng mặc định của Spring Boot là :8080 (không dùng nhầm :5173 của Web Frontend)
// =========================================================================
export const DEFAULT_BASE_URL = 'http://192.168.2.106:8080';

const IP_STORAGE_KEY = '@library_backend_ip';

export const getBaseUrl = async () => {
  try {
    const saved = await AsyncStorage.getItem(IP_STORAGE_KEY);
    return saved || DEFAULT_BASE_URL;
  } catch {
    return DEFAULT_BASE_URL;
  }
};

export const setBaseUrl = async (newUrl) => {
  try {
    if (!newUrl) {
      await AsyncStorage.removeItem(IP_STORAGE_KEY);
    } else {
      let formatted = newUrl.trim();
      if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
        formatted = `http://${formatted}`;
      }
      while (formatted.endsWith('/')) {
        formatted = formatted.slice(0, -1);
      }
      await AsyncStorage.setItem(IP_STORAGE_KEY, formatted);
    }
  } catch (err) {
    console.error('Không thể lưu IP server:', err);
  }
};
