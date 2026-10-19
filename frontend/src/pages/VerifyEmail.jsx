import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { verifyEmail } from '../api/authApi';
import '../styles/auth.css';

function VerifyEmail() {
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token');

  const hasVerified = useRef(false);

  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Đang xác thực tài khoản...');

  useEffect(() => {
    if (hasVerified.current) {
      return;
    }

    hasVerified.current = true;

    const handleVerifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Link xác thực không hợp lệ hoặc thiếu token!');
        return;
      }

      try {
        const response = await verifyEmail(token);

        console.log('Verify response:', response.data);

        setStatus('success');

        if (typeof response.data === 'string') {
          setMessage(response.data);
        } else {
          setMessage(response.data?.message || 'Xác thực email thành công!');
        }
      } catch (error) {
        console.error('Verify email error:', error);

        setStatus('error');

        const data = error.response?.data;

        if (typeof data === 'string') {
          setMessage(data);
        } else {
          setMessage(data?.message || 'Link xác thực không hợp lệ hoặc đã hết hạn!');
        }
      }
    };

    handleVerifyEmail();
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-box verify-box">
        <h1>Library Management</h1>

        <p className="auth-subtitle">Hệ thống quản lý thư viện</p>

        <div className={`verify-icon ${status}`}>
          {status === 'loading' && '⏳'}
          {status === 'success' && '✓'}
          {status === 'error' && '×'}
        </div>

        <h2>
          {status === 'loading' && 'Đang xác thực email'}
          {status === 'success' && 'Xác thực thành công'}
          {status === 'error' && 'Xác thực thất bại'}
        </h2>

        <p
          className={`auth-message ${
            status === 'success' ? 'success' : status === 'error' ? 'error' : ''
          }`}
        >
          {message}
        </p>

        {status === 'success' && (
          <Link to="/login" className="verify-login-button">
            Đăng nhập ngay
          </Link>
        )}

        {status === 'error' && (
          <p className="auth-link">
            <Link to="/register">Quay lại đăng ký</Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
