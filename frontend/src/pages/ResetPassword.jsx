import AuthStory from '../components/AuthStory';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Library, KeyRound, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { resetPassword } from '../api/authApi';
import ThemeToggle from '../components/ThemeToggle';
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
    } else if (newPassword.length < 4) {
      err.newPassword = 'Mật khẩu mới phải có ít nhất 4 ký tự!';
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
    if (loading) return;
    setMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      await resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword: newPassword,
      });

      setMessage('Đặt lại mật khẩu thành công! Đang chuyển hướng về trang đăng nhập...');

      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error) {

      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else {
        setMessage('Đặt lại mật khẩu thất bại! Vui lòng kiểm tra lại mã OTP.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthStory />
      <div className="auth-top-actions">
        <ThemeToggle />
      </div>

      <div className="auth-box">
        {/* Brand Header */}
        <div className="auth-brand-badge">
          <div className="auth-logo-icon">
            <Library size={24} />
          </div>
          <span className="auth-brand-name">Aura Library</span>
        </div>

        <div className="auth-header-text">
          <h1>Đặt lại mật khẩu</h1>
          <p className="auth-subtitle">
            Nhập mã OTP 6 số đã nhận qua email <strong>{email || 'của bạn'}</strong>
          </p>
        </div>

        {message && (
          <div className="auth-alert auth-alert-success" role="alert">
            <CheckCircle2 size={18} className="auth-alert-icon" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleResetPassword} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="reset-otp">Mã OTP (6 chữ số) *</label>
            <div className="auth-input-wrapper">
              <KeyRound size={17} className="auth-input-leading-icon" />
              <input
                id="reset-otp"
                type="text"
                maxLength={6}
                className={errors.otp ? 'input-error with-leading-icon' : 'with-leading-icon'}
                placeholder="Nhập 6 chữ số OTP..."
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  if (errors.otp) setErrors((prev) => ({ ...prev, otp: '' }));
                }}
              />
            </div>
            {errors.otp && <span className="field-error"><AlertCircle size={13} />{errors.otp}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="reset-new-password">Mật khẩu mới *</label>
            <div className="auth-input-wrapper">
              <Lock size={17} className="auth-input-leading-icon" />
              <input
                id="reset-new-password"
                type="password"
                className={errors.newPassword ? 'input-error with-leading-icon' : 'with-leading-icon'}
                placeholder="Tối thiểu 4 ký tự..."
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }));
                }}
              />
            </div>
            {errors.newPassword && <span className="field-error"><AlertCircle size={13} />{errors.newPassword}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="reset-confirm-password">Xác nhận mật khẩu mới *</label>
            <div className="auth-input-wrapper">
              <Lock size={17} className="auth-input-leading-icon" />
              <input
                id="reset-confirm-password"
                type="password"
                className={errors.confirmPassword ? 'input-error with-leading-icon' : 'with-leading-icon'}
                placeholder="Nhập lại mật khẩu mới..."
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
              />
            </div>
            {errors.confirmPassword && <span className="field-error"><AlertCircle size={13} />{errors.confirmPassword}</span>}
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? (
              <span className="auth-btn-loading">
                <span className="auth-spinner" />
                Đang cập nhật mật khẩu...
              </span>
            ) : (
              'Cập nhật mật khẩu mới'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="auth-link-bold">
            ← Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
