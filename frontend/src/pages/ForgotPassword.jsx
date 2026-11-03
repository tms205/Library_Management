import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { forgotPassword } from '../api/authApi';
import '../styles/auth.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleForgotPassword = async (event) => {
    event.preventDefault();

    setMessage('');
    setEmailError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      setEmailError('Vui lòng nhập địa chỉ email!');
      return;
    }

    if (!emailRegex.test(email.trim())) {
      setEmailError('Email không đúng định dạng (Ví dụ: user@example.com)!');
      return;
    }

    try {
      setLoading(true);

      await forgotPassword({
        email: email.trim(),
      });

      setMessage('Mã OTP đã được gửi tới email của bạn!');

      setTimeout(() => {
        navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`);
      }, 1000);
    } catch (error) {
      console.error(error);

      if (error.response) {
        setMessage(error.response.data?.message || 'Không thể gửi mã OTP!');
      } else {
        setMessage('Không thể kết nối đến server!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h1>Library Management</h1>

        <p className="auth-subtitle">Hệ thống quản lý thư viện</p>

        <h2>Quên mật khẩu</h2>

        <p className="auth-subtitle">Nhập email của bạn để nhận mã OTP đặt lại mật khẩu.</p>

        <form onSubmit={handleForgotPassword}>
          <div className="form-group">
            <label>Email *</label>

            <input
              type="email"
              className={emailError ? 'input-error' : ''}
              placeholder="Nhập email đã đăng ký"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (emailError) setEmailError('');
              }}
            />
            {emailError && <span className="field-error">{emailError}</span>}
          </div>

          {message && <p className="auth-message">{message}</p>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
          </button>
        </form>

        <p className="auth-link">
          <Link to="/login">Quay lại đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
