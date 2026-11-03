import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../api/changePasswordApi';

import '../styles/changePassword.css';

function ChangePassword() {
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const validateForm = () => {
    const err = {};

    if (!oldPassword) {
      err.oldPassword = 'Vui lòng nhập mật khẩu hiện tại!';
    }

    if (!newPassword) {
      err.newPassword = 'Mật khẩu mới không được để trống!';
    } else if (newPassword.length < 6) {
      err.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự!';
    } else if (oldPassword && newPassword === oldPassword) {
      err.newPassword = 'Mật khẩu mới không được trùng với mật khẩu hiện tại!';
    }

    if (!confirmPassword) {
      err.confirmPassword = 'Vui lòng nhập lại mật khẩu mới!';
    } else if (newPassword !== confirmPassword) {
      err.confirmPassword = 'Mật khẩu nhập lại không khớp!';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage('');
    setError('');

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const response = await changePassword({
        oldPassword,
        newPassword,
      });

      setMessage(response.data || 'Đổi mật khẩu thành công! Đang chuyển hướng...');

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Sau 1 giây chuyển về Dashboard
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
    <div className="change-password-page">
      <div className="change-password-card">
        <div className="change-password-header">
          <p>Library / Account Security</p>
          <h1>Đổi mật khẩu tài khoản</h1>
          <span>Cập nhật mật khẩu bảo mật mới cho tài khoản của bạn.</span>
        </div>

        {error && <div className="change-password-error">{error}</div>}
        {message && <div className="change-password-success">{message}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="change-password-field">
            <label>Mật khẩu hiện tại *</label>
            <input
              type="password"
              className={errors.oldPassword ? 'input-error' : ''}
              placeholder="Nhập mật khẩu hiện tại"
              value={oldPassword}
              onChange={(event) => {
                setOldPassword(event.target.value);
                if (errors.oldPassword) setErrors((prev) => ({ ...prev, oldPassword: '' }));
              }}
            />
            {errors.oldPassword && <span className="field-error">{errors.oldPassword}</span>}
          </div>

          <div className="change-password-field">
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

          <div className="change-password-field">
            <label>Xác nhận lại mật khẩu mới *</label>
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

          <button type="submit" className="change-password-button" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;
