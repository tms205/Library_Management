import AuthStory from '../components/AuthStory';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Library, CheckCircle2, AlertCircle, KeyRound, Mail, ArrowRight } from 'lucide-react';
import { verifyEmail, verifyEmailOtp, resendVerification } from '../api/authApi';
import ThemeToggle from '../components/ThemeToggle';
import '../styles/auth.css';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const hasVerified = useRef(false);

  const [status, setStatus] = useState(token ? 'loading' : 'otp_form');
  const [message, setMessage] = useState(token ? 'Đang xác thực tài khoản...' : '');

  // OTP Form States
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [resending, setResending] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => timer && clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (!token) return;

    if (hasVerified.current) {
      return;
    }

    hasVerified.current = true;

    const handleVerifyEmail = async () => {
      try {
        const response = await verifyEmail(token);
        setStatus('success');

        if (typeof response.data === 'string') {
          setMessage(response.data);
        } else {
          setMessage(response.data?.message || 'Xác thực email thành công!');
        }
      } catch (error) {
        setStatus('error');
        const data = error.response?.data;

        if (typeof data === 'string') {
          setMessage(data);
        } else {
          setMessage(data?.message || 'Liên kết xác thực không hợp lệ hoặc đã hết hạn!');
        }
      }
    };

    handleVerifyEmail();
  }, [token]);

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    setResendMsg('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setOtpError('Email không hợp lệ (Ví dụ: user@example.com)!');
      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      setOtpError('Mã OTP phải gồm đúng 6 chữ số!');
      return;
    }

    try {
      setOtpLoading(true);
      await verifyEmailOtp(email.trim(), otp.trim());
      setStatus('success');
      setMessage('Xác thực tài khoản bạn đọc thành công qua mã OTP!');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Mã OTP không đúng hoặc đã hết hạn!';
      setOtpError(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resending || countdown > 0) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setOtpError('Vui lòng nhập email hợp lệ để nhận lại mã!');
      return;
    }

    try {
      setOtpError('');
      setResending(true);
      setResendMsg('Đang gửi lại mã...');
      await resendVerification(email.trim());
      setResendMsg('Đã gửi lại mã OTP mới đến email của bạn!');
      setCountdown(60);
    } catch (err) {
      setResendMsg('');
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Không thể gửi lại mã xác thực!';
      setOtpError(msg);
    } finally { setResending(false); }
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

        {status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div className="spinner" style={{ width: '36px', height: '36px', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Đang xác thực tài khoản</h2>
            <p className="auth-subtitle">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--status-success-soft)', color: 'var(--status-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px' }}>Xác thực thành công!</h2>
            <p className="auth-subtitle" style={{ marginBottom: '24px' }}>{message}</p>
            <Link to="/login" className="auth-button" style={{ textDecoration: 'none' }}>
              Đăng nhập ngay <ArrowRight size={16} style={{ marginLeft: '6px' }} />
            </Link>
          </div>
        )}

        {(status === 'error' || status === 'otp_form') && (
          <>
            <div className="auth-header-text">
              <h1>Kích hoạt tài khoản</h1>
              <p className="auth-subtitle">
                {status === 'error'
                  ? 'Liên kết email đã hết hạn. Bạn có thể nhập mã OTP 6 số bên dưới:'
                  : 'Nhập mã OTP 6 chữ số trong email để kích hoạt thẻ bạn đọc:'}
              </p>
            </div>

            {status === 'error' && message && (
              <div className="auth-alert auth-alert-error" role="alert">
                <AlertCircle size={18} className="auth-alert-icon" />
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="auth-form" noValidate>
              <div className="form-group">
                <label htmlFor="verify-email">Email tài khoản</label>
                <div className="auth-input-wrapper">
                  <Mail size={17} className="auth-input-leading-icon" />
                  <input
                    id="verify-email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={otpError && !email ? 'input-error with-leading-icon' : 'with-leading-icon'}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="verify-otp">Mã xác thực OTP (6 chữ số)</label>
                <div className="auth-input-wrapper">
                  <KeyRound size={17} className="auth-input-leading-icon" />
                  <input
                    id="verify-otp"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    style={{
                      fontSize: '20px',
                      letterSpacing: '6px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                    }}
                    className={otpError && !otp ? 'input-error with-leading-icon' : 'with-leading-icon'}
                  />
                </div>
                {otpError && <span className="field-error"><AlertCircle size={13} />{otpError}</span>}
                {resendMsg && (
                  <span style={{ color: 'var(--status-success)', fontSize: '13px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={14} />{resendMsg}
                  </span>
                )}
              </div>

              <button type="submit" className="auth-button" disabled={otpLoading}>
                {otpLoading ? (
                  <span className="auth-btn-loading">
                    <span className="auth-spinner" />
                    Đang kích hoạt...
                  </span>
                ) : (
                  'Xác thực và kích hoạt thẻ'
                )}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '13.5px' }}>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || resending}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: countdown > 0 ? 'var(--text-muted)' : 'var(--primary-accent)',
                    cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    padding: 0,
                    height: 'auto',
                  }}
                >
                  {countdown > 0 ? `Gửi lại mã (${countdown}s)` : 'Gửi lại mã OTP'}
                </button>

                <Link to="/login" className="auth-link">
                  Quay lại đăng nhập
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
