import AuthStory from '../components/AuthStory';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Library, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { forgotPassword } from '../api/authApi';
import ThemeToggle from '../components/ThemeToggle';
import '../styles/auth.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    if (loading) return;

    setMessage('');
    setMessageType('success');
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

      setMessage('Mã OTP khôi phục đã được gửi về email của bạn. Vui lòng kiểm tra hộp thư.');

      setTimeout(() => {
        navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`);
      }, 1500);
    } catch (error) {
      setMessageType('error');

      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else {
        setMessage('Không thể gửi mã khôi phục mật khẩu!');
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
          <h1>Quên mật khẩu</h1>
          <p className="auth-subtitle">Nhập email đã đăng ký để nhận mã OTP khôi phục tài khoản</p>
        </div>

        {message && (
          <div className={`auth-alert auth-alert-${messageType}`} role="alert">
            {messageType === 'success' ? <CheckCircle2 size={18} className="auth-alert-icon" /> : <AlertCircle size={18} className="auth-alert-icon" />}
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleForgotPassword} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="forgot-email">Địa chỉ Email của bạn</label>
            <div className="auth-input-wrapper">
              <Mail size={17} className="auth-input-leading-icon" />
              <input
                id="forgot-email"
                type="email"
                className={emailError ? 'input-error with-leading-icon' : 'with-leading-icon'}
                placeholder="Nhập email (ví dụ: user@example.com)"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (emailError) setEmailError('');
                }}
              />
            </div>
            {emailError && (
              <span className="field-error">
                <AlertCircle size={13} />
                {emailError}
              </span>
            )}
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? (
              <span className="auth-btn-loading">
                <span className="auth-spinner" />
                Đang gửi mã OTP...
              </span>
            ) : (
              'Gửi mã xác thực qua Email'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>Nhớ mật khẩu?</span>
          <Link to="/login" className="auth-link-bold">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
