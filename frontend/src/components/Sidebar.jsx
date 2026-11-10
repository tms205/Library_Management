import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  BookMarked,
  Library,
  Users,
  ClipboardList,
  ShieldCheck,
  Sliders,
  KeyRound,
  Mail,
  LogOut,
  X,
} from 'lucide-react';
import { hasPermission, hasAnyPermission, getUserInfo, logout } from '../utils/auth';

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const user = getUserInfo();

  // Định nghĩa các mục menu và permission yêu cầu
  const menuSections = [
    {
      title: 'TỔNG QUAN',
      items: [
        {
          label: 'Dashboard',
          to: '/dashboard',
          Icon: LayoutDashboard,
          permission: null,
        },
      ],
    },
    {
      title: 'KHÔNG GIAN ĐỘC GIẢ',
      items: [
        {
          label: 'Danh mục sách',
          to: '/books',
          Icon: BookOpen,
          permission: 'BOOK_VIEW',
        },
        {
          label: 'Mượn sách mới',
          to: '/borrow',
          Icon: BookMarked,
          permission: 'BORROW_BOOK',
        },
        {
          label: 'Sách của tôi',
          to: '/return',
          Icon: Library,
          permissions: ['BORROW_BOOK', 'RETURN_BOOK'],
        },
      ],
    },
    {
      title: 'QUẢN TRỊ THƯ VIỆN',
      items: [
        {
          label: 'Kho sách chi tiết',
          to: '/books/manage',
          Icon: BookOpen,
          permissions: ['BOOK_CREATE', 'BOOK_UPDATE', 'BOOK_DELETE', 'BOOK_IMPORT'],
        },
        {
          label: 'Độc giả & Thành viên',
          to: '/members',
          Icon: Users,
          permission: 'MEMBER_VIEW',
        },
        {
          label: 'Quản lý mượn / trả',
          to: '/borrow-management',
          Icon: ClipboardList,
          permissions: ['BORROW_APPROVE', 'RETURN_CONFIRM'],
        },
      ],
    },
    {
      title: 'HỆ THỐNG',
      items: [
        {
          label: 'Phân quyền tài khoản',
          to: '/roles',
          Icon: ShieldCheck,
          permission: 'SYSTEM_MAINTENANCE',
        },
        {
          label: 'Cấu hình hệ thống',
          to: '/system-config',
          Icon: Sliders,
          permission: 'SYSTEM_MAINTENANCE',
        },
      ],
    },
  ];

  const visibleSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.permission && !item.permissions) return true;
        if (item.permission) return hasPermission(item.permission);
        if (item.permissions) return hasAnyPermission(item.permissions);
        return false;
      }),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`aura-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand-wrapper">
          <div className="sidebar-brand">
            <div className="brand-icon">
              <Library size={22} />
            </div>
            <div className="brand-text">
              <h2>Aura Library</h2>
              <span>Hệ thống thư viện số</span>
            </div>
          </div>
          <button type="button" className="sidebar-close-btn" onClick={onClose} aria-label="Đóng menu">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav-container">
          {visibleSections.map((section) => (
            <div key={section.title} className="nav-section-group">
              <span className="nav-section-title">{section.title}</span>
              {section.items.map((item) => {
                const Icon = item.Icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/dashboard'}
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={onClose}
                  >
                    <Icon size={18} className="link-icon" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}

          <div className="nav-section-group" style={{ marginTop: '16px' }}>
            <span className="nav-section-title">TÀI KHOẢN CÁ NHÂN</span>
            <NavLink
              to="/change-password"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <KeyRound size={18} className="link-icon" />
              <span>Đổi mật khẩu</span>
            </NavLink>
            <NavLink
              to="/change-email"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <Mail size={18} className="link-icon" />
              <span>Đổi email</span>
            </NavLink>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="user-avatar">
              {(user.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <strong>{user.username}</strong>
              <small>{user.email}</small>
            </div>
          </div>
          <button
            type="button"
            className="logout-button"
            onClick={logout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
