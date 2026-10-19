import { Link, useNavigate } from 'react-router-dom';

import '../styles/dashboard.css';

function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    navigate('/login', {
      replace: true,
    });
  };

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">L</div>

          <div>
            <h2>Library</h2>
            <span>Management</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          <Link to="/dashboard" className="sidebar-item active">
            <span className="sidebar-icon">⌂</span>
            Dashboard
          </Link>

          <Link to="/books" className="sidebar-item">
            <span className="sidebar-icon">▤</span>
            Quản lý sách
          </Link>

          <Link to="/members" className="sidebar-item">
            <span className="sidebar-icon">♙</span>
            Quản lý thành viên
          </Link>

          <Link to="/borrow" className="sidebar-item">
            <span className="sidebar-icon">→</span>
            Mượn sách
          </Link>

          <Link to="/return" className="sidebar-item">
            <span className="sidebar-icon">←</span>
            Trả sách
          </Link>

          <Link to="/system-config" className="sidebar-item">
            <span className="sidebar-icon">⚙</span>
            Cấu hình hệ thống
          </Link>
        </nav>

        <div className="sidebar-bottom">
          <Link to="/change-password" className="sidebar-item">
            <span className="sidebar-icon">⌘</span>
            Đổi mật khẩu
          </Link>

          <Link to="/change-email" className="sidebar-item">
            <span className="sidebar-icon">✉</span>
            Đổi email
          </Link>

          <button type="button" className="logout-button" onClick={handleLogout}>
            <span className="sidebar-icon">↪</span>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>Dashboard</h1>

            <p>Chào mừng bạn quay trở lại hệ thống thư viện.</p>
          </div>

          <div className="user-box">
            <div className="user-avatar">A</div>

            <div>
              <strong>Admin</strong>
              <span>Administrator</span>
            </div>
          </div>
        </header>

        <section className="welcome-card">
          <div>
            <span className="welcome-label">LIBRARY MANAGEMENT SYSTEM</span>

            <h2>Quản lý thư viện dễ dàng hơn</h2>

            <p>Quản lý sách, thành viên, mượn trả và cấu hình hệ thống tại một nơi.</p>
          </div>

          <div className="welcome-decoration">📚</div>
        </section>

        <section className="quick-section">
          <div className="section-title">
            <div>
              <h2>Truy cập nhanh</h2>
              <p>Các chức năng thường sử dụng</p>
            </div>
          </div>

          <div className="quick-grid">
            <Link to="/books" className="quick-card">
              <div className="quick-icon">📖</div>

              <div>
                <h3>Quản lý sách</h3>
                <p>Tìm kiếm, thêm, sửa, xóa và import sách.</p>
              </div>

              <span className="quick-arrow">→</span>
            </Link>

            <Link to="/members" className="quick-card">
              <div className="quick-icon">👥</div>

              <div>
                <h3>Thành viên</h3>
                <p>Quản lý thông tin các thành viên thư viện.</p>
              </div>

              <span className="quick-arrow">→</span>
            </Link>

            <Link to="/borrow" className="quick-card">
              <div className="quick-icon">📤</div>

              <div>
                <h3>Mượn sách</h3>
                <p>Tạo phiếu và quản lý việc mượn sách.</p>
              </div>

              <span className="quick-arrow">→</span>
            </Link>

            <Link to="/return" className="quick-card">
              <div className="quick-icon">📥</div>

              <div>
                <h3>Trả sách</h3>
                <p>Xử lý trả sách và cập nhật số lượng kho.</p>
              </div>

              <span className="quick-arrow">→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
