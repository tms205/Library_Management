import { useLocation } from 'react-router-dom';
import { getUserInfo, logout } from '../utils/auth';

const ROUTE_TITLES = {
  '/dashboard': { title: 'Dashboard', pretitle: 'Tổng quan hệ thống' },
  '/books': { title: 'Danh sách sách', pretitle: 'Tra cứu & Danh mục' },
  '/books/manage': { title: 'Quản lý kho sách', pretitle: 'Thủ thư / Quản trị' },
  '/members': { title: 'Quản lý thành viên', pretitle: 'Hồ sơ độc giả & bạn đọc' },
  '/borrow': { title: 'Mượn sách', pretitle: 'Tạo yêu cầu mượn mới' },
  '/return': { title: 'Sách của tôi', pretitle: 'Lịch sử & Yêu cầu trả sách' },
  '/my-books': { title: 'Sách của tôi', pretitle: 'Lịch sử & Yêu cầu trả sách' },
  '/borrow-management': { title: 'Quản lý mượn / trả', pretitle: 'Xét duyệt & Xác nhận thu hồi sách' },
  '/system-config': { title: 'Cấu hình hệ thống', pretitle: 'Trạng thái & Chế độ bảo trì' },
  '/change-password': { title: 'Đổi mật khẩu', pretitle: 'Bảo mật tài khoản' },
  '/change-email': { title: 'Đổi email', pretitle: 'Cập nhật email xác thực' },
};

export default function Topbar({ onToggleSidebar = () => {} }) {
  const location = useLocation();
  const user = getUserInfo();

  const currentRoute = ROUTE_TITLES[location.pathname] || {
    title: 'Thư viện số',
    pretitle: 'Library Management',
  };

  return (
    <header className="lib-topbar">
      <div className="lib-topbar-left">
        <button
          type="button"
          className="lib-mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation Menu"
        >
          ☰
        </button>

        <div className="lib-topbar-breadcrumb">
          <span className="lib-breadcrumb-pre">{currentRoute.pretitle}</span>
          <h1 className="lib-breadcrumb-title">{currentRoute.title}</h1>
        </div>
      </div>

      <div className="lib-topbar-right">
        <div className="lib-topbar-user">
          <div className="lib-topbar-avatar">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="lib-topbar-info">
            <strong className="lib-topbar-name">{user.username}</strong>
            <span className={`lib-role-tag lib-role-${user.badgeColor}`}>
              {user.groupName}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="lib-topbar-logout"
          onClick={logout}
          title="Đăng xuất khỏi hệ thống"
        >
          <span>↪</span>
          <span className="lib-topbar-logout-text">Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}
