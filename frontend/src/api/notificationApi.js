import axiosClient from './axiosClient';

const API_URL = '/api/notifications';

// Lấy danh sách thông báo phân trang của người dùng hiện tại
export const getNotifications = (page = 0, size = 10) => {
  return axiosClient.get(API_URL, {
    params: { page, size },
  });
};

// Lấy số lượng thông báo chưa đọc
export const getUnreadCount = () => {
  return axiosClient.get(`${API_URL}/unread-count`);
};

// Đánh dấu 1 thông báo là đã đọc
export const markNotificationAsRead = (id) => {
  return axiosClient.put(`${API_URL}/${id}/read`);
};

// Đánh dấu tất cả thông báo là đã đọc
export const markAllNotificationsAsRead = () => {
  return axiosClient.put(`${API_URL}/read-all`);
};
