import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Clock, BookOpen, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { getUserInfo } from '../utils/auth';
import '../styles/notification.css';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const user = getUserInfo();

  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (item) => {
    if (!item.isRead) {
      await markAsRead(item.id);
    }
    setIsOpen(false);

    // Điều hướng thông minh theo loại thông báo và quyền tài khoản
    if (item.type === 'BORROW_APPROVED') {
      navigate('/return');
    } else if (item.type === 'RETURN_REQUEST' || item.referenceType === 'RETURN_RECORD') {
      navigate(user?.isAdmin || user?.isStaff ? '/borrow-management?status=RETURN_PENDING' : '/return');
    } else if (item.type === 'BORROW_REQUEST' || item.referenceType === 'BORROW_BATCH') {
      navigate(user?.isAdmin || user?.isStaff ? '/borrow-management?status=PENDING' : '/return');
    } else {
      navigate(user?.isAdmin || user?.isStaff ? '/borrow-management' : '/return');
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffSec = Math.floor((now - date) / 1000);

      if (diffSec < 60) return 'Vừa xong';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} phút trước`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} giờ trước`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay === 1) return 'Hôm qua';
      if (diffDay < 7) return `${diffDay} ngày trước`;
      return date.toLocaleDateString('vi-VN');
    } catch {
      return '';
    }
  };

  return (
    <div className="notification-bell-container" ref={containerRef}>
      <button
        type="button"
        className="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Thông báo hệ thống"
        title="Thông báo"
        aria-expanded={isOpen}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <div className="notification-header-title">
              <span>Thông báo</span>
              {unreadCount > 0 && (
                <span className="notification-header-count">{unreadCount} mới</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all-btn"
                onClick={markAllAsRead}
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck size={14} />
                <span>Đã đọc hết</span>
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading && notifications.length === 0 ? (
              <div className="notification-empty">Đang tải thông báo...</div>
            ) : error ? (
              <div className="notification-empty notification-error">
                <AlertCircle size={16} />
                <span>Không thể nạp thông báo</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <span>Chưa có thông báo mới nào</span>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`notification-item ${!item.isRead ? 'is-unread' : ''}`}
                  onClick={() => handleNotificationClick(item)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="notification-item-icon">
                    {item.type === 'RETURN_REQUEST' ? (
                      <RotateCcw size={16} />
                    ) : item.type === 'BORROW_APPROVED' ? (
                      <CheckCheck size={16} style={{ color: '#10b981' }} />
                    ) : (
                      <BookOpen size={16} />
                    )}
                  </div>
                  <div className="notification-item-body">
                    <div className="notification-item-title">
                      <span>{item.title}</span>
                      {!item.isRead && <span className="notification-unread-dot" />}
                    </div>
                    <div className="notification-item-content">{item.content}</div>
                    <div className="notification-item-meta">
                      <Clock size={12} />
                      <span>{formatRelativeTime(item.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="notification-dropdown-footer">
            <button
              type="button"
              className="notification-view-all-link"
              onClick={() => {
                setIsOpen(false);
                navigate(user?.isAdmin || user?.isStaff ? '/borrow-management' : '/return');
              }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <span>{user?.isAdmin || user?.isStaff ? 'Xem danh sách mượn trả' : 'Xem tủ sách của tôi'}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
