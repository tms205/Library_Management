import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Menu,
  ArrowRight,
  BookMarked,
} from 'lucide-react';
import { getUserInfo } from '../utils/auth';
import { searchBooks } from '../api/bookApi';
import ThemeToggle from './ThemeToggle';

const ROUTE_TITLES = {
  '/dashboard': { title: 'Bảng Điều Khiển', pretitle: 'Tổng quan hệ thống' },
  '/books': { title: 'Tra Cứu Sách', pretitle: 'Kho sách & Khám phá tư liệu' },
  '/books/manage': { title: 'Quản Lý Kho Sách', pretitle: 'Nghiệp vụ thủ thư & Quản trị' },
  '/members': { title: 'Quản Lý Độc Giả', pretitle: 'Danh bạ thành viên & Thẻ bạn đọc' },
  '/borrow': { title: 'Đăng Ký Mượn Sách', pretitle: 'Tạo phiếu mượn trực tuyến' },
  '/return': { title: 'Sách Của Tôi', pretitle: 'Tủ sách cá nhân & Yêu cầu hoàn trả' },
  '/my-books': { title: 'Sách Của Tôi', pretitle: 'Tủ sách cá nhân & Yêu cầu hoàn trả' },
  '/borrow-management': { title: 'Phê Duyệt Mượn Trả', pretitle: 'Kiểm soát luân chuyển tài liệu' },
  '/roles': { title: 'Phân Quyền Hệ Thống', pretitle: 'Ma trận quyền truy cập' },
  '/system-config': { title: 'Cấu Hình Hệ Thống', pretitle: 'Chế độ bảo trì & Tham số' },
  '/change-password': { title: 'Đổi Mật Khẩu', pretitle: 'Bảo mật tài khoản cá nhân' },
  '/change-email': { title: 'Đổi Email', pretitle: 'Cập nhật địa chỉ liên hệ' },
};

export default function Topbar({ onToggleSidebar = () => {} }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUserInfo();

  const currentRoute = ROUTE_TITLES[location.pathname] || {
    title: 'Thư Viện Số',
    pretitle: 'Aura Library System',
  };

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Retained legacy component: cancel stale search completion on every query.
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!query.trim()) { setResults([]); setSearching(false); return; }
      setSearching(true);
      try { const response = await searchBooks({ title: query.trim(), page: 0, size: 5 }); if (active) setResults(response.data?.content || []); }
      catch { if (active) setResults([]); }
      finally { if (active) setSearching(false); }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleDocClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  const handleSelectBook = (book) => {
    setIsOpen(false);
    setQuery('');
    navigate(`/books?title=${encodeURIComponent(book.title)}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setIsOpen(false);
    if (query.trim()) {
      navigate(`/books?title=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="aura-topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Mở thanh điều hướng"
        >
          <Menu size={20} />
        </button>

        <div className="route-meta">
          <span className="route-pretitle">{currentRoute.pretitle}</span>
          <h1 className="route-title">{currentRoute.title}</h1>
        </div>
      </div>

      <div className="topbar-right">
        {/* Quick Search */}
        <div className="topbar-search-box" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="search-form">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Tra cứu sách nhanh..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
            />
          </form>

          {isOpen && query.trim() && (
            <div className="search-dropdown-panel">
              {searching ? (
                <div className="search-status-row">
                  <span className="spinner" />
                  <span>Đang tra cứu cơ sở dữ liệu...</span>
                </div>
              ) : results.length === 0 ? (
                <div className="search-status-row">
                  <span>Không tìm thấy tựa sách nào khớp với &quot;{query}&quot;</span>
                </div>
              ) : (
                <div className="search-results-list">
                  {results.map((b) => (
                    <button
                      type="button"
                      key={b.id}
                      className="search-item"
                      onClick={() => handleSelectBook(b)}
                    >
                      <BookMarked size={16} className="item-icon" />
                      <div className="item-text">
                        <strong className="item-title">{b.title}</strong>
                        <span className="item-meta">
                          {b.author || 'Tác giả chưa cập nhật'} • Còn {b.availableQuantity ?? 0} cuốn
                        </span>
                      </div>
                      <ArrowRight size={14} className="item-arrow" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <ThemeToggle />

        <div className="topbar-user-pill">
          <div className="user-avatar-tiny">
            {(user.username || 'U').charAt(0).toUpperCase()}
          </div>
          <span className="user-name-tiny">{user.username}</span>
        </div>
      </div>
    </header>
  );
}
