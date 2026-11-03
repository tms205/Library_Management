import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUserInfo, logout } from '../utils/auth';
import { searchBooks } from '../api/bookApi';

const ROUTE_TITLES = {
  '/dashboard': { title: 'Dashboard', pretitle: 'Tổng quan hệ thống' },
  '/books': { title: 'Danh sách sách', pretitle: 'Tra cứu & Danh mục' },
  '/books/manage': { title: 'Quản lý kho sách', pretitle: 'Thủ thư / Quản trị' },
  '/members': { title: 'Quản lý thành viên', pretitle: 'Hồ sơ độc giả & bạn đọc' },
  '/borrow': { title: 'Mượn sách', pretitle: 'Tạo yêu cầu mượn mới' },
  '/return': { title: 'Sách của tôi', pretitle: 'Lịch sử & Yêu cầu trả sách' },
  '/my-books': { title: 'Sách của tôi', pretitle: 'Lịch sử & Yêu cầu trả sách' },
  '/borrow-management': { title: 'Quản lý mượn / trả', pretitle: 'Xét duyệt & Xác nhận thu hồi sách' },
  '/roles': { title: 'Phân quyền tài khoản', pretitle: 'Quản trị viên' },
  '/system-config': { title: 'Cấu hình hệ thống', pretitle: 'Trạng thái & Chế độ bảo trì' },
  '/change-password': { title: 'Đổi mật khẩu', pretitle: 'Bảo mật tài khoản' },
  '/change-email': { title: 'Đổi email', pretitle: 'Cập nhật email xác thực' },
};

export default function Topbar({ onToggleSidebar = () => {} }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUserInfo();

  const currentRoute = ROUTE_TITLES[location.pathname] || {
    title: 'Thư viện số',
    pretitle: 'Library Management',
  };

  // State thanh tìm kiếm nhanh (Áp dụng ý tưởng Lucian UX/UI Prompt #046 & #249)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Bắt phím tắt Ctrl + K / Cmd + K để focus nhanh vào ô tìm kiếm
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isK = e.key?.toLowerCase() === 'k' || e.code === 'KeyK';
      if ((e.ctrlKey || e.metaKey) && isK) {
        e.preventDefault();
        e.stopPropagation();
        inputRef.current?.focus();
        inputRef.current?.select();
        setShowDropdown(true);
      }
      if (e.key === 'Escape') {
        setShowDropdown(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Tìm kiếm tức thì theo thời gian thực (debounce 200ms)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      setSelectedIndex(-1);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setSelectedIndex(-1);

    const timer = setTimeout(() => {
      searchBooks({ title: trimmed, page: 0, size: 6 })
        .then((res) => {
          if (!cancelled) {
            const list = res.data?.content || [];
            setSearchResults(list);
            setIsSearching(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSearchResults([]);
            setIsSearching(false);
          }
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Chọn một kết quả tìm kiếm
  const handleSelectBook = (book) => {
    setShowDropdown(false);
    setSearchQuery('');
    setSelectedIndex(-1);
    navigate(`/books?title=${encodeURIComponent(book.title)}`);
  };

  // Xem tất cả kết quả
  const handleViewAll = () => {
    setShowDropdown(false);
    setSelectedIndex(-1);
    const q = searchQuery.trim();
    navigate(q ? `/books?title=${encodeURIComponent(q)}` : '/books');
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

      {/* Thanh tìm kiếm nhanh toàn hệ thống (Ctrl + K) */}
      <div className="lib-topbar-center" ref={searchContainerRef}>
        <div className="lib-search-container">
          <div
            className="lib-search-input-wrap"
            onClick={() => {
              inputRef.current?.focus();
              setShowDropdown(true);
            }}
          >
            <span className="lib-search-icon">🔍</span>
            <input
              ref={inputRef}
              type="text"
              className="lib-search-input"
              placeholder="Tìm nhanh đầu sách... (Ctrl + K)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (searchResults.length > 0) {
                    setSelectedIndex((prev) =>
                      prev < searchResults.length - 1 ? prev + 1 : 0
                    );
                  }
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (searchResults.length > 0) {
                    setSelectedIndex((prev) =>
                      prev > 0 ? prev - 1 : searchResults.length - 1
                    );
                  }
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (selectedIndex >= 0 && searchResults[selectedIndex]) {
                    handleSelectBook(searchResults[selectedIndex]);
                  } else {
                    handleViewAll();
                  }
                } else if (e.key === 'Escape') {
                  setShowDropdown(false);
                  inputRef.current?.blur();
                }
              }}
            />
            {isSearching ? (
              <span style={{ fontSize: '14px', color: '#6366f1' }}>⏳</span>
            ) : (
              <span
                className="lib-search-kbd"
                title="Nhấn Ctrl + K để tìm nhanh"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.focus();
                  inputRef.current?.select();
                  setShowDropdown(true);
                }}
              >
                Ctrl K
              </span>
            )}
          </div>

          {/* Dropdown xem trước kết quả trực tiếp */}
          {showDropdown && (
            <div className="lib-search-dropdown">
              <div className="lib-search-drop-header">
                <span>
                  {searchQuery.trim()
                    ? `Kết quả tìm kiếm (${searchResults.length})`
                    : 'Tra cứu nhanh đầu sách'}
                </span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Phím ESC để đóng</span>
              </div>

              {!searchQuery.trim() ? (
                <div className="lib-search-guide">
                  <div className="lib-search-guide-title">
                    <span>💡 Gợi ý tra cứu</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b' }}>
                    Nhập tên sách, tác giả hoặc mã ISBN để tìm kiếm tức thì trên toàn thư viện.
                  </p>
                  <div className="lib-search-guide-tips">
                    <span className="lib-search-guide-tip">↵ Enter xem tất cả</span>
                    <span className="lib-search-guide-tip">↑ ↓ chọn sách</span>
                    <span className="lib-search-guide-tip">ESC để đóng</span>
                  </div>
                </div>
              ) : isSearching ? (
                <div className="lib-search-empty">
                  <span style={{ marginRight: '8px' }}>⏳</span> Đang tìm kiếm sách...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="lib-search-empty">
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>🔍</div>
                  <div>Không tìm thấy sách nào khớp với &quot;{searchQuery}&quot;</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                    Hãy thử tìm với từ khóa khác hoặc bấm Enter để tra cứu nâng cao
                  </div>
                </div>
              ) : (
                <div className="lib-search-list">
                  {searchResults.map((book, idx) => {
                    const authorStr = Array.from(book.authors || []).join(', ');
                    const inStock = (book.quantity || 0) > 0;
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={book.id}
                        className={`lib-search-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectBook(book)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <div className="lib-search-item-icon">📖</div>
                        <div className="lib-search-item-info">
                          <div className="lib-search-item-title">{book.title}</div>
                          <div className="lib-search-item-sub">
                            {authorStr ? `Tác giả: ${authorStr}` : `ISBN: ${book.isbn || '—'}`}
                          </div>
                        </div>
                        <span
                          className={`lib-search-item-badge ${inStock ? 'in-stock' : 'out-stock'}`}
                        >
                          {inStock ? `Còn ${book.quantity}` : 'Hết sách'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {searchQuery.trim() && searchResults.length > 0 && (
                <div className="lib-search-drop-footer" onClick={handleViewAll}>
                  Xem tất cả kết quả trên trang tra cứu &rarr;
                </div>
              )}
            </div>
          )}
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
