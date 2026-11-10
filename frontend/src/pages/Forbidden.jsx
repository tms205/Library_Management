import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, BookOpen } from 'lucide-react';
import { getUserInfo } from '../utils/auth';

export default function Forbidden() {
  const user = getUserInfo();

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        padding: '40px 32px',
        textAlign: 'center',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{
          display: 'inline-block',
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--status-danger-text)',
          backgroundColor: 'var(--status-danger-soft)',
          border: '1px solid var(--status-danger-border)',
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)',
          marginBottom: '18px'
        }}>
          MÃ LỖI: 403 FORBIDDEN
        </div>

        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'var(--status-danger-soft)',
          color: 'var(--status-danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <ShieldAlert size={36} />
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 12px' }}>
          Bạn không có quyền truy cập
        </h1>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 20px' }}>
          Trang hoặc chức năng này yêu cầu quyền hạn cao hơn phân quyền hiện tại của tài khoản{' '}
          <strong>{user.email || 'của bạn'}</strong> (Nhóm: <em>{user.groupName || 'Độc giả'}</em>).
        </p>

        <div style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          fontSize: '13px',
          color: 'var(--text-muted)',
          marginBottom: '24px'
        }}>
          Nếu bạn cần quyền truy cập vào chức năng này, vui lòng liên hệ Ban Quản Trị Thư Viện để được cấp quyền.
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link to="/dashboard" className="btn btn-primary">
            <ArrowLeft size={16} /> Về trang chủ
          </Link>
          <Link to="/books" className="btn btn-outline">
            <BookOpen size={16} /> Xem danh sách sách
          </Link>
        </div>
      </div>
    </div>
  );
}
