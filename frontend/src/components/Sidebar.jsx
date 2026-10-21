import { NavLink, useLocation } from 'react-router-dom';
import { hasPermission, hasAnyPermission, getUserInfo, logout } from '../utils/auth';

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const location = useLocation();
  const user = getUserInfo();

  // Định nghĩa các mục menu và permission yêu cầu
  const menuSections = [
    {
      title: 'TỔNG QUAN',
      items: [
        {
          label: 'Dashboard',
          to: '/dashboard',
          icon: '⌂',
          permission: null, // Tất cả user đăng nhập đều xem được
        },
      ],
    },
    {
      title: 'SÁCH',
      items: [
        {
          label: 'Danh sách sách',
          to: '/books',
          icon: '📖',
          permission: 'BOOK_VIEW',
        },
        {
          label: 'Mượn sách',
          to: '/borrow',
          icon: '📤',
          permission: 'BORROW_BOOK',
        },
        {
          label: 'Sách của tôi',
          to: '/return',
          icon: '📥',
          permissions: ['BORROW_BOOK', 'RETURN_BOOK'],
        },
      ],
    },
    {
      title: 'QUẢN LÝ THƯ VIỆN',
      items: [
        {
          label: 'Quản lý sách',
          to: '/books/manage',
          icon: '📚',
          permissions: ['BOOK_CREATE', 'BOOK_UPDATE', 'BOOK_DELETE', 'BOOK_IMPORT'],
        },
        {
          label: 'Quản lý thành viên',
          to: '/members',
          icon: '👥',
          permission: 'MEMBER_VIEW',
        },
        {
          label: 'Quản lý mượn / trả',
          to: '/borrow-management',
          icon: '📋',
          permissions: ['BORROW_APPROVE', 'RETURN_CONFIRM'],
        },
      ],
    },
    {
      title: 'HỆ THỐNG',
      items: [
        {
          label: 'Cấu hình hệ thống',
          to: '/system-config',
          icon: '⚙',
          permission: 'SYSTEM_MAINTENANCE',
        },
      ],
    },
  ];

  // Lọc chỉ giữ lại các item mà user có permission
  const filteredSections = menuSections
    .map((section) => {
      const visibleItems = section.items.filter((item) => {
        if (!item.permission && !item.permissions) return true;
        if (item.permissions) {
          return hasAnyPermission(item.permissions);
        }
        return hasPermission(item.permission);
      });

      return {
        ...section,
        items: visibleItems,
      };
    })
    // QUY TẮC: Nếu một nhóm không có menu con nào thì không hiển thị tiêu đề nhóm đó!
    .filter((section) => section.items.length > 0);

  const handleLinkClick = () => {
    // Đóng drawer nếu trên màn hình mobile
    if (onClose) onClose();
  };

  return (
    <aside className={`lib-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo Thương hiệu Thư viện */}
      <div className="lib-sidebar-logo">
        <div className="lib-logo-icon">L</div>
        <div className="lib-logo-text">
          <h2>Library</h2>
          <span>Management System</span>
        </div>
      </div>

      {/* Thông tin nhanh User */}
      <div className="lib-sidebar-user">
        <div className="lib-user-avatar">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="lib-user-meta">
          <strong title={user.email}>{user.username}</strong>
          <span className={`lib-role-tag lib-role-${user.badgeColor}`}>
            {user.groupName}
          </span>
        </div>
      </div>

      {/* Menu phân nhóm theo Permission */}
      <nav className="lib-sidebar-nav">
        {filteredSections.map((section) => (
          <div key={section.title} className="lib-nav-group">
            <div className="lib-nav-group-title">{section.title}</div>
            <div className="lib-nav-group-items">
              {section.items.map((item) => {
                const isActive =
                  location.pathname === item.to ||
                  (item.to === '/return' && location.pathname === '/my-books');

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={handleLinkClick}
                    className={`lib-nav-item ${isActive ? 'active' : ''}`}
                  >
                    <span className="lib-nav-icon">{item.icon}</span>
                    <span className="lib-nav-label">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Phần cuối Sidebar: Tài khoản & Đăng xuất */}
      <div className="lib-sidebar-footer">
        <NavLink
          to="/change-password"
          onClick={handleLinkClick}
          className={`lib-nav-item ${location.pathname === '/change-password' ? 'active' : ''}`}
        >
          <span className="lib-nav-icon">⌘</span>
          <span className="lib-nav-label">Đổi mật khẩu</span>
        </NavLink>

        <NavLink
          to="/change-email"
          onClick={handleLinkClick}
          className={`lib-nav-item ${location.pathname === '/change-email' ? 'active' : ''}`}
        >
          <span className="lib-nav-icon">✉</span>
          <span className="lib-nav-label">Đổi email</span>
        </NavLink>

        <button type="button" className="lib-logout-btn" onClick={logout}>
          <span className="lib-nav-icon">↪</span>
          <span className="lib-nav-label">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
