import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { resetPassword } from '../api/authApi';
import '../styles/auth.css';

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (event) => {
    event.preventDefault();

    setMessage('');

    if (!email || !otp || !newPassword || !confirmPassword) {
      setMessage('Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    if (otp.length !== 6) {
      setMessage('OTP phải gồm đúng 6 chữ số!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Mật khẩu xác nhận không khớp!');
      return;
    }

    try {
      setLoading(true);

      await resetPassword({
        email: email,
        otp: otp,
        newPassword: newPassword,
      });

      setMessage('Đặt lại mật khẩu thành công!');

      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error) {
      console.error(error);

      const data = error.response?.data;

      if (data?.message) {
        setMessage(data.message);
      } else if (typeof data === 'string') {
        setMessage(data);
      } else {
        setMessage('Đặt lại mật khẩu thất bại!');
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

        <h2>Đặt lại mật khẩu</h2>

        <form onSubmit={handleResetPassword}>
          <div className="form-group">
            <label>Email</label>

            <input type="email" value={email} disabled />
          </div>

          <div className="form-group">
            <label>Mã OTP</label>

            <input
              type="text"
              placeholder="Nhập mã OTP 6 số"
              value={otp}
              maxLength={6}
              onChange={(event) => {
                const value = event.target.value.replace(/\D/g, '');
                setOtp(value);
              }}
            />
          </div>

          <div className="form-group">
            <label>Mật khẩu mới</label>

            <input
              type="password"
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Xác nhận mật khẩu</label>

            <input
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          {message && <p className="auth-message">{message}</p>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
          </button>
        </form>

        <p className="auth-link">
          <Link to="/login">Quay lại đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
