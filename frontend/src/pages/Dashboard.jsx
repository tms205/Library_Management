import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { hasPermission, hasAnyPermission, getUserInfo } from '../utils/auth';
import { searchBooks } from '../api/bookApi';
import { searchMembers } from '../api/memberApi';
import { getBorrowManagement, getMyBorrowedBooks } from '../api/borrowApi';

import '../styles/dashboard.css';

function Dashboard() {
  const user = getUserInfo();

  // Quyền hạn thực tế từ JWT
  const canViewBooks = hasPermission('BOOK_VIEW');
  const canManageBooks = hasAnyPermission(['BOOK_CREATE', 'BOOK_UPDATE', 'BOOK_DELETE', 'BOOK_IMPORT']);
  const canViewMembers = hasPermission('MEMBER_VIEW');
  const canBorrow = hasPermission('BORROW_BOOK');
  const canReturn = hasPermission('RETURN_BOOK');
  const canApproveBorrow = hasPermission('BORROW_APPROVE');
  const canConfirmReturn = hasPermission('RETURN_CONFIRM');
  const canManageBorrow = canApproveBorrow || canConfirmReturn;
  const canSystemConfig = hasPermission('SYSTEM_MAINTENANCE');

  // Thống kê động
  const [stats, setStats] = useState({
    totalBooks: null,
    totalMembers: null,
    pendingApprovals: null,
    myBorrowedCount: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const promises = [];

        // 1. Tổng số sách nếu có quyền BOOK_VIEW
        if (canViewBooks) {
          promises.push(
            searchBooks({ page: 0, size: 1 })
              .then((res) => {
                const data = res.data;
                const total =
                  data?.totalElements ??
                  (Array.isArray(data?.content) ? data.content.length : Array.isArray(data) ? data.length : 0);
                return { totalBooks: total };
              })
              .catch(() => ({ totalBooks: '—' })),
          );
        }

        // 2. Tổng số thành viên nếu có quyền MEMBER_VIEW
        if (canViewMembers) {
          promises.push(
            searchMembers({ page: 0, size: 1 })
              .then((res) => {
                const data = res.data;
                const total =
                  data?.totalElements ??
                  (Array.isArray(data?.content) ? data.content.length : Array.isArray(data) ? data.length : 0);
                return { totalMembers: total };
              })
              .catch(() => ({ totalMembers: '—' })),
          );
        }

        // 3. Yêu cầu chờ duyệt nếu là Thủ thư/Admin
        if (canApproveBorrow) {
          promises.push(
            getBorrowManagement()
              .then((res) => {
                const list = Array.isArray(res.data) ? res.data : [];
                const pending = list.filter((r) => r.status === 'PENDING').length;
                return { pendingApprovals: pending };
              })
              .catch(() => ({ pendingApprovals: '—' })),
          );
        }

        // 4. Sách đang mượn của tài khoản hiện tại (User/Staff/Admin)
        if (canBorrow || canReturn) {
          promises.push(
            getMyBorrowedBooks()
              .then((res) => {
                const list = Array.isArray(res.data) ? res.data : [];
                const active = list.filter((r) => r.status === 'BORROWED').length;
                return { myBorrowedCount: active };
              })
              .catch(() => ({ myBorrowedCount: '—' })),
          );
        }

        const results = await Promise.all(promises);
        if (!cancelled) {
          const merged = Object.assign({}, ...results);
          setStats((prev) => ({
            ...prev,
            ...merged,
            loading: false,
          }));
        }
      } catch {
        if (!cancelled) {
          setStats((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [canViewBooks, canViewMembers, canApproveBorrow, canBorrow, canReturn]);

  return (
    <div className="dashboard-content-wrapper" style={{ padding: '30px 36px 60px' }}>
      {/* Banner Chào Mừng */}
      <section className="welcome-card">
        <div>
          <span className="welcome-label">LIBRARY MANAGEMENT SYSTEM</span>
          <h2>Xin chào, {user.username}!</h2>
          <p>
            Chào mừng bạn đến với Cổng thông tin Thư viện số. Bạn đang đăng nhập với phân quyền{' '}
            <strong>{user.groupName}</strong>.
          </p>
        </div>
        <div className="welcome-decoration">📚</div>
      </section>

      {/* STATS CARDS THEO PERMISSION THỰC TẾ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '18px',
          marginTop: '28px',
        }}
      >
        {/* Card: Tổng số sách trong thư viện (Yêu cầu BOOK_VIEW) */}
        {canViewBooks && (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '22px 24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: '#eef2ff',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              📖
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Kho sách thư viện</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
                {stats.loading ? '...' : stats.totalBooks ?? '—'}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Đầu sách hiện có</div>
            </div>
          </div>
        )}

        {/* Card: Thành viên thư viện (Staff/Admin có MEMBER_VIEW) */}
        {canViewMembers && (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '22px 24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: '#ecfdf5',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              👥
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Thành viên</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
                {stats.loading ? '...' : stats.totalMembers ?? '—'}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Bạn đọc đã đăng ký</div>
            </div>
          </div>
        )}

        {/* Card: Yêu cầu mượn chờ duyệt (Staff/Admin có BORROW_APPROVE) */}
        {canApproveBorrow && (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '22px 24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: '#fffbeb',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              ⏳
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Chờ duyệt mượn</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#b45309', margin: '4px 0 2px' }}>
                {stats.loading ? '...' : stats.pendingApprovals ?? '0'}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Phiếu cần xử lý</div>
            </div>
          </div>
        )}

        {/* Card: Sách tôi đang mượn (USER/STAFF/ADMIN) */}
        {(canBorrow || canReturn) && (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '22px 24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: '#f5f3ff',
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              📚
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Sách đang mượn</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
                {stats.loading ? '...' : stats.myBorrowedCount ?? '0'}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Cuốn sách trong tay bạn</div>
            </div>
          </div>
        )}
      </div>

      {/* TRUY CẬP NHANH (QUICK ACTIONS) - Chỉ hiện khi có permission */}
      <section className="quick-section">
        <div className="section-title">
          <div>
            <h2>Truy cập nhanh</h2>
            <p>Các chức năng phù hợp với quyền hạn tài khoản của bạn</p>
          </div>
        </div>

        <div className="quick-grid">
          {/* 1. Tra cứu sách - BOOK_VIEW */}
          {canViewBooks && !canManageBooks && (
            <Link to="/books" className="quick-card">
              <div className="quick-icon">📖</div>
              <div>
                <h3>Danh sách sách</h3>
                <p>Tìm kiếm, tra cứu thông tin và tình trạng còn/hết sách trong kho.</p>
              </div>
              <span className="quick-arrow">→</span>
            </Link>
          )}

          {/* 2. Quản lý sách - Staff/Admin có CRUD */}
          {canManageBooks && (
            <Link to="/books/manage" className="quick-card">
              <div className="quick-icon">📚</div>
              <div>
                <h3>Quản lý kho sách</h3>
                <p>Thêm sách mới, cập nhật thông tin, nhập file CSV và quản lý tồn kho.</p>
              </div>
              <span className="quick-arrow">→</span>
            </Link>
          )}

          {/* 3. Mượn sách - BORROW_BOOK */}
          {canBorrow && (
            <Link to="/borrow" className="quick-card">
              <div className="quick-icon">📤</div>
              <div>
                <h3>Mượn sách</h3>
                <p>Chọn các cuốn sách yêu thích và gửi yêu cầu mượn đến thủ thư.</p>
              </div>
              <span className="quick-arrow">→</span>
            </Link>
          )}

          {/* 4. Sách của tôi - BORROW_BOOK hoặc RETURN_BOOK */}
          {(canBorrow || canReturn) && (
            <Link to="/return" className="quick-card">
              <div className="quick-icon">📥</div>
              <div>
                <h3>Sách của tôi</h3>
                <p>Theo dõi tiến độ duyệt, lịch sử mượn và gửi yêu cầu trả sách.</p>
              </div>
              <span className="quick-arrow">→</span>
            </Link>
          )}

          {/* 5. Quản lý thành viên - MEMBER_VIEW */}
          {canViewMembers && (
            <Link to="/members" className="quick-card">
              <div className="quick-icon">👥</div>
              <div>
                <h3>Quản lý thành viên</h3>
                <p>Tra cứu danh sách độc giả, cấp tài khoản và chỉnh sửa thông tin thành viên.</p>
              </div>
              <span className="quick-arrow">→</span>
            </Link>
          )}

          {/* 6. Quản lý mượn / trả - BORROW_APPROVE hoặc RETURN_CONFIRM */}
          {canManageBorrow && (
            <Link to="/borrow-management" className="quick-card">
              <div className="quick-icon">📋</div>
              <div>
                <h3>Quản lý mượn / trả</h3>
                <p>Xét duyệt yêu cầu mượn, từ chối hoặc xác nhận nhận lại sách từ bạn đọc.</p>
              </div>
              <span className="quick-arrow">→</span>
            </Link>
          )}

          {/* 7. Cấu hình hệ thống - SYSTEM_MAINTENANCE */}
          {canSystemConfig && (
            <Link to="/system-config" className="quick-card">
              <div className="quick-icon">⚙</div>
              <div>
                <h3>Cấu hình hệ thống</h3>
                <p>Quản lý trạng thái vận hành và chuyển đổi chế độ bảo trì toàn hệ thống.</p>
              </div>
              <span className="quick-arrow">→</span>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
