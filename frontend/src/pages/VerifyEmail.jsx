import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { verifyEmail, verifyEmailOtp, resendVerification } from '../api/authApi';
import '../styles/auth.css';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const hasVerified = useRef(false);

  const [status, setStatus] = useState(token ? 'loading' : 'otp_form');
  const [message, setMessage] = useState(token ? 'Đang xác thực tài khoản...' : '');

  // OTP Form States (cho phép kích hoạt bằng mã 6 số)
  const [email, setEmail] = useState('');
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
    if (!token) {
      setStatus('otp_form');
      return;
    }

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
          setMessage(data?.message || 'Link xác thực không hợp lệ hoặc đã hết hạn!');
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
      setMessage('Xác thực tài khoản thành công qua mã OTP!');
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setOtpError('Vui lòng nhập email hợp lệ để nhận lại mã!');
      return;
    }

    try {
      setOtpError('');
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
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-box verify-box">
        <h1>Library Management</h1>
        <p className="auth-subtitle">Hệ thống quản lý thư viện</p>

        {status === 'loading' && (
          <>
            <div className="verify-icon loading">⏳</div>
            <h2>Đang xác thực email</h2>
            <p className="auth-message">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="verify-icon success">✓</div>
            <h2>Xác thực thành công</h2>
            <p className="auth-message success">{message}</p>
            <Link to="/login" className="verify-login-button">
              Đăng nhập ngay
            </Link>
          </>
        )}

        {(status === 'error' || status === 'otp_form') && (
          <>
            {status === 'error' && (
              <>
                <div className="verify-icon error">×</div>
                <h2>Xác thực qua liên kết thất bại</h2>
                <p className="auth-message error">{message}</p>
                <div style={{ margin: '16px 0', borderBottom: '1px dashed #cbd5e1' }} />
                <h3 style={{ fontSize: '18px', color: '#1e293b', marginBottom: '8px' }}>
                  Xác thực bằng mã OTP 6 số
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                  Bạn có thể nhập mã OTP 6 chữ số được gửi kèm trong email để kích hoạt:
                </p>
              </>
            )}

            {status === 'otp_form' && (
              <>
                <div className="verify-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                  ✉️
                </div>
                <h2>Kích hoạt tài khoản</h2>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                  Nhập mã OTP 6 số trong email để kích hoạt tài khoản của bạn:
                </p>
              </>
            )}

            <form onSubmit={handleVerifyOtp} style={{ textAlign: 'left' }}>
              <div className="form-group">
                <label>Email tài khoản</label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={otpError && !email ? 'input-error' : ''}
                />
              </div>

              <div className="form-group">
                <label>Mã xác thực OTP (6 chữ số)</label>
                <input
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  style={{
                    fontSize: '22px',
                    letterSpacing: '6px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  }}
                  className={otpError && !otp ? 'input-error' : ''}
                />
              </div>

              {otpError && <p className="field-error" style={{ marginBottom: '12px' }}>{otpError}</p>}
              {resendMsg && (
                <p style={{ color: '#059669', fontSize: '14px', marginBottom: '12px', fontWeight: '500' }}>
                  {resendMsg}
                </p>
              )}

              <button
                type="submit"
                className="auth-button"
                disabled={otpLoading}
                style={{ width: '100%', marginBottom: '12px' }}
              >
                {otpLoading ? 'Đang xác thực...' : 'Xác thực và Kích hoạt'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', fontSize: '14px' }}>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: countdown > 0 ? '#94a3b8' : '#4f46e5',
                    cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    padding: 0,
                  }}
                >
                  {countdown > 0 ? `Gửi lại mã (${countdown}s)` : 'Gửi lại mã OTP'}
                </button>

                <Link to="/login" style={{ color: '#64748b', textDecoration: 'none' }}>
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
