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

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const err = {};

    if (!otp.trim()) {
      err.otp = 'Mã OTP không được để trống!';
    } else if (!/^\d{6}$/.test(otp.trim())) {
      err.otp = 'Mã OTP phải gồm đúng 6 chữ số!';
    }

    if (!newPassword) {
      err.newPassword = 'Mật khẩu mới không được để trống!';
    } else if (newPassword.length < 6) {
      err.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự!';
    }

    if (!confirmPassword) {
      err.confirmPassword = 'Vui lòng xác nhận lại mật khẩu!';
    } else if (newPassword !== confirmPassword) {
      err.confirmPassword = 'Mật khẩu xác nhận không khớp!';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    setMessage('');

    if (!email) {
      setMessage('Không tìm thấy thông tin email. Vui lòng quay lại bước Quên mật khẩu!');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      await resetPassword({
        email: email,
        otp: otp.trim(),
        newPassword: newPassword,
      });

      setMessage('Đặt lại mật khẩu thành công! Đang chuyển hướng...');

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
            <label>Mã OTP *</label>

            <input
              type="text"
              className={errors.otp ? 'input-error' : ''}
              placeholder="Nhập mã OTP 6 số"
              value={otp}
              maxLength={6}
              onChange={(event) => {
                const value = event.target.value.replace(/\D/g, '');
                setOtp(value);
                if (errors.otp) setErrors((prev) => ({ ...prev, otp: '' }));
              }}
            />
            {errors.otp && <span className="field-error">{errors.otp}</span>}
          </div>

          <div className="form-group">
            <label>Mật khẩu mới *</label>

            <input
              type="password"
              className={errors.newPassword ? 'input-error' : ''}
              placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }));
              }}
            />
            {errors.newPassword && <span className="field-error">{errors.newPassword}</span>}
          </div>

          <div className="form-group">
            <label>Xác nhận mật khẩu mới *</label>

            <input
              type="password"
              className={errors.confirmPassword ? 'input-error' : ''}
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
            />
            {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
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
