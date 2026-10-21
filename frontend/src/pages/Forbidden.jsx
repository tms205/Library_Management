import { Link } from 'react-router-dom';
import { getUserInfo } from '../utils/auth';

export default function Forbidden() {
  const user = getUserInfo();

  return (
    <div className="forbidden-wrapper">
      <div className="forbidden-card">
        <div className="forbidden-badge">MÃ LỖI: 403</div>

        <div className="forbidden-icon-box">
          <span className="forbidden-icon">🚫</span>
        </div>

        <h1 className="forbidden-title">Bạn không có quyền truy cập</h1>

        <p className="forbidden-message">
          Trang hoặc chức năng này yêu cầu quyền hạn cao hơn phân quyền hiện tại của tài khoản{' '}
          <strong>{user.email || 'của bạn'}</strong> (Nhóm: <em>{user.groupName}</em>).
        </p>

        <div className="forbidden-notice">
          <span>Nếu bạn cần quyền truy cập vào chức năng này, vui lòng liên hệ Ban Quản Trị Thư Viện để được cấp quyền.</span>
        </div>

        <div className="forbidden-actions">
          <Link to="/dashboard" className="forbidden-btn forbidden-btn-primary">
            <span>⌂</span> Quay lại Dashboard
          </Link>
          <Link to="/books" className="forbidden-btn forbidden-btn-secondary">
            <span>▤</span> Xem danh sách sách
          </Link>
        </div>
      </div>
    </div>
  );
}
