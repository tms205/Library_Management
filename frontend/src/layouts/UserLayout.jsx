import ReaderSearch from '../components/ReaderSearch';
import AccountMenu from '../components/AccountMenu';
import NotificationBell from '../components/NotificationBell';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { hasPermission } from '../utils/auth';
import Brand from '../components/Brand';
import ThemeToggle from '../components/ThemeToggle';
import Modal from '../components/Modal';

export default function UserLayout() {
  const [open, setOpen] = useState(false);
  const links = [
    { to: '/dashboard', label: 'Trang chủ' },
    ...(hasPermission('BOOK_VIEW') ? [{ to: '/books', label: 'Khám phá sách' }] : []),
    ...(hasPermission('BORROW_BOOK') && hasPermission('BOOK_VIEW') ? [{ to: '/borrow', label: 'Đăng ký mượn' }] : []),
    ...(hasPermission('BORROW_BOOK') ? [{ to: '/my-books', label: 'Tủ sách của tôi' }] : []),
  ];
  const navLinks = links.map((l) => (
    <NavLink
      key={l.to}
      to={l.to}
      onClick={() => setOpen(false)}
      className={({ isActive }) => `reader-nav-link ${isActive ? 'active' : ''}`}
    >
      {l.label}
    </NavLink>
  ));

  return (
    <div className="reader-layout">
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <header className="reader-header">
        <div className="reader-header-inner">
          <Link to="/dashboard" aria-label="Aura Library - Trang chủ">
            <Brand />
          </Link>
          <nav className="reader-navigation" aria-label="Điều hướng thư viện">
            {navLinks}
          </nav>
          <div className="reader-actions">
            <NotificationBell />
            <ThemeToggle />
            <AccountMenu />
            <button
              type="button"
              className="icon-button mobile-only"
              aria-label="Mở menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
          </div>
        </div>
      </header>
      {open && (
        <Modal
          onClose={() => setOpen(false)}
          className="navigation-drawer reader-drawer"
          labelledBy="reader-menu-title"
        >
          <div className="drawer-header">
            <h2 id="reader-menu-title">Thư viện của bạn</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Đóng menu"
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <nav>{navLinks}</nav>
        </Modal>
      )}
      {hasPermission('BOOK_VIEW') && (
        <div className="reader-search-strip">
          <span>Một cuốn sách hay đang chờ bạn.</span>
          <ReaderSearch />
        </div>
      )}
      <main id="main-content" className="reader-main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="reader-footer">
        <Brand />
        <p>Mỗi trang sách, một góc nhìn mới.</p>
        <span>© {new Date().getFullYear()} Aura Library</span>
      </footer>
    </div>
  );
}
