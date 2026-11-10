import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../api/notificationApi';
import { createSseSubscription } from '../api/sseClient';
import { useToast } from '../context/ToastContext';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const seenNotificationIds = useRef(new Set());
  const toast = useToast();

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await getUnreadCount();
      setUnreadCount(res.data?.unreadCount || 0);
    } catch {
      // Bỏ qua lỗi ngầm khi không có mạng
    }
  }, []);

  const loadNotifications = useCallback(async (page = 0, size = 10) => {
    try {
      setLoading(true);
      setError('');
      const res = await getNotifications(page, size);
      const items = res.data?.content || [];
      items.forEach((item) => seenNotificationIds.current.add(item.id));
      setNotifications(items);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách thông báo');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMarkAsRead = useCallback(async (id) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error('Không thể cập nhật trạng thái thông báo.');
    }
  }, [toast]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc!');
    } catch {
      toast.error('Không thể đánh dấu tất cả đã đọc.');
    }
  }, [toast]);

  useEffect(() => {
    // Chỉ kích hoạt SSE và tải thông báo nếu người dùng đã đăng nhập (có accessToken)
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }

    loadUnreadCount();
    loadNotifications(0, 10);

    const subscription = createSseSubscription({
      onOpen: () => {
        // Mỗi khi kết nối thành công (hoặc reconnect), đồng bộ lại dữ liệu
        loadUnreadCount();
        loadNotifications(0, 10);
      },
      onMessage: ({ data }) => {
        if (!data) return;

        // Tăng số đếm chưa đọc
        setUnreadCount((prev) => prev + 1);

        // Hiển thị thông báo Toast nổi trên màn hình phù hợp với loại sự kiện
        if (data.type === 'BORROW_APPROVED') {
          const title = data.title || 'Yêu cầu mượn sách đã được duyệt!';
          const msg = data.content || (data.bookTitle
            ? `Yêu cầu mượn sách "${data.bookTitle}" của bạn đã được phê duyệt thành công.`
            : 'Yêu cầu mượn sách của bạn đã được phê duyệt.');
          toast.success(msg, title);
        } else if (data.type === 'BORROW_REQUEST') {
          const title = 'Yêu cầu mượn sách mới';
          const msg = data.memberName
            ? `Độc giả ${data.memberName} vừa gửi yêu cầu mượn ${data.totalBooks || 1} cuốn sách.`
            : 'Có yêu cầu mượn sách mới cần xử lý.';
          toast.info(msg, title);
        } else if (data.type === 'RETURN_REQUEST') {
          const title = 'Yêu cầu trả sách mới';
          const msg = data.memberName
            ? `Độc giả ${data.memberName} vừa gửi yêu cầu trả cuốn sách: "${data.bookTitle}".`
            : 'Có yêu cầu trả sách mới cần xử lý.';
          toast.info(msg, title);
        } else if (data.title || data.content) {
          toast.info(data.content || data.title, data.title || 'Thông báo mới');
        }

        // Tải lại danh sách thông báo mới nhất
        loadNotifications(0, 10);
      },
      onError: () => {
        // SSE tự động retry trong sseClient
      },
    });

    return () => {
      subscription.abort();
    };
  }, [loadNotifications, loadUnreadCount, toast]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    refresh: () => {
      loadUnreadCount();
      loadNotifications(0, 10);
    },
  };
}
