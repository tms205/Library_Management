import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { changePassword } from '../api/changePasswordApi';
import '../styles/changePassword.css';

export default function ChangePassword() {
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
      err.confirmPassword = 'Mật khẩu xác nhận không khớp!';
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

      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (err) {


      const data = err.response?.data;

      if (typeof data === 'string') {
        setError(data);
      } else if (data?.message) {
        setError(data.message);
      } else if (data?.error) {
        setError(data.error);
      } else {
        setError('Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-page">
      <div className="change-password-card">
        <header className="change-password-header">
          <div className="change-password-icon-wrapper">
            <KeyRound size={24} />
          </div>
          <div>
            <div className="change-password-pretitle">Tài khoản &bull; Bảo mật</div>
            <h1>Đổi mật khẩu tài khoản</h1>
            <p>Cập nhật mật khẩu mới để bảo vệ an toàn cho tài khoản thư viện của bạn.</p>
          </div>
        </header>

        {error && (
          <div className="change-password-msg error">
            <AlertCircle size={18} className="msg-icon" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="change-password-msg success">
            <CheckCircle2 size={18} className="msg-icon" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="change-password-form">
          {/* Mật khẩu hiện tại */}
          <div className="change-password-field">
            <label htmlFor="oldPassword">Mật khẩu hiện tại *</label>
            <div className={`input-with-icon ${errors.oldPassword ? 'has-error' : ''}`}>
              <Lock size={16} className="field-prefix-icon" />
              <input
                id="oldPassword"
                type={showOld ? 'text' : 'password'}
                placeholder="Nhập mật khẩu bạn đang dùng"
                value={oldPassword}
                onChange={(event) => {
                  setOldPassword(event.target.value);
                  if (errors.oldPassword) setErrors((prev) => ({ ...prev, oldPassword: '' }));
                }}
              />
              <button
                type="button"
                className="btn-toggle-eye"
                onClick={() => setShowOld((prev) => !prev)}
                aria-label={showOld ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.oldPassword && <span className="field-error-text">{errors.oldPassword}</span>}
          </div>

          {/* Mật khẩu mới */}
          <div className="change-password-field">
            <label htmlFor="newPassword">Mật khẩu mới *</label>
            <div className={`input-with-icon ${errors.newPassword ? 'has-error' : ''}`}>
              <Lock size={16} className="field-prefix-icon" />
              <input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                placeholder="Tối thiểu 6 ký tự"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }));
                }}
              />
              <button
                type="button"
                className="btn-toggle-eye"
                onClick={() => setShowNew((prev) => !prev)}
                aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword && <span className="field-error-text">{errors.newPassword}</span>}
          </div>

          {/* Xác nhận mật khẩu mới */}
          <div className="change-password-field">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu mới *</label>
            <div className={`input-with-icon ${errors.confirmPassword ? 'has-error' : ''}`}>
              <ShieldCheck size={16} className="field-prefix-icon" />
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Nhập lại chính xác mật khẩu mới"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
              />
              <button
                type="button"
                className="btn-toggle-eye"
                onClick={() => setShowConfirm((prev) => !prev)}
                aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="field-error-text">{errors.confirmPassword}</span>
            )}
          </div>

          <div className="change-password-actions">
            <button
              type="button"
              className="btn btn-outline"
              disabled={loading}
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={15} />
              <span>Quay lại</span>
            </button>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              <KeyRound size={15} />
              <span>{loading ? 'Đang cập nhật...' : 'Xác nhận đổi mật khẩu'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
