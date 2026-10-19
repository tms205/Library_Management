import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { changePassword } from '../api/changePasswordApi';

import '../styles/changePassword.css';

function ChangePassword() {
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState('');

  const [newPassword, setNewPassword] = useState('');

  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState('');

  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage('');
    setError('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ thông tin!');

      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự!');

      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp!');

      return;
    }

    try {
      setLoading(true);

      const response = await changePassword({
        oldPassword,
        newPassword,
      });

      setMessage(response.data);

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Sau 1 giay tu dong ve trang chu
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      console.error(err);

      const data = err.response?.data;

      if (typeof data === 'string') {
        setError(data);
      } else if (data?.message) {
        setError(data.message);
      } else if (data?.error) {
        setError(data.error);
      } else {
        setError('Không thể đổi mật khẩu!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="change-password-page">
      <div className="change-password-card">
        <div className="change-password-header">
          <p>Library / Account</p>

          <h1>Đổi mật khẩu</h1>

          <span>Cập nhật mật khẩu cho tài khoản hiện tại.</span>
        </div>

        {error && <div className="change-password-error">{error}</div>}

        {message && <div className="change-password-success">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="change-password-field">
            <label>Mật khẩu hiện tại</label>

            <input
              type="password"
              placeholder="Nhập mật khẩu hiện tại"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
            />
          </div>

          <div className="change-password-field">
            <label>Mật khẩu mới</label>

            <input
              type="password"
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>

          <div className="change-password-field">
            <label>Nhập lại mật khẩu mới</label>

            <input
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          <button type="submit" className="change-password-button" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
          </button>
        </form>

        <Link to="/dashboard" className="change-password-back">
          ← Quay lại trang chủ
        </Link>
      </div>
    </main>
  );
}

export default ChangePassword;
