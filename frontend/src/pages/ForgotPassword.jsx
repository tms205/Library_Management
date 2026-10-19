import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { forgotPassword } from '../api/authApi';
import '../styles/auth.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleForgotPassword = async (event) => {
    event.preventDefault();

    setMessage('');

    if (!email) {
      setMessage('Vui lòng nhập email!');
      return;
    }

    try {
      setLoading(true);

      await forgotPassword({
        email: email,
      });

      setMessage('Mã OTP đã được gửi tới email!');

      setTimeout(() => {
        navigate(`/reset-password?email=${encodeURIComponent(email)}`);
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
            <label>Email</label>

            <input
              type="email"
              placeholder="Nhập email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
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
