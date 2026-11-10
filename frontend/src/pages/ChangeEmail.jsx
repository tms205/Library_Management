import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Send,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { requestChangeEmail, confirmChangeEmail } from '../api/changeEmailApi';
import { getUserInfo } from '../utils/auth';
import '../styles/changeEmail.css';

export default function ChangeEmail() {
  const navigate = useNavigate();
  const currentUser = getUserInfo();

  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [emailError, setEmailError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [step, setStep] = useState(1);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // =========================
  // GỬI MÃ XÁC NHẬN
  // =========================
  const handleRequestCode = async (event) => {
    event.preventDefault();

    setMessage('');
    setError('');
    setEmailError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmed = newEmail.trim();

    if (!trimmed) {
      setEmailError('Vui lòng nhập địa chỉ email mới!');
      return;
    }

    if (!emailRegex.test(trimmed)) {
      setEmailError('Email không đúng định dạng (Ví dụ: reader@example.com)!');
      return;
    }

    if (currentUser?.email && trimmed.toLowerCase() === currentUser.email.toLowerCase()) {
      setEmailError('Email mới không được trùng với email hiện tại!');
      return;
    }

    try {
      setLoading(true);

      const response = await requestChangeEmail(trimmed);

      setMessage(
        response.data ||
          'Mã xác nhận gồm 6 chữ số đã được gửi đến email hiện tại của bạn. Vui lòng kiểm tra hộp thư.',
      );
      setStep(2);
    } catch (err) {


      const data = err.response?.data;

      if (typeof data === 'string') {
        setError(data);
      } else {
        setError(data?.message || data?.error || 'Không thể gửi mã xác nhận!');
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // XÁC NHẬN ĐỔI EMAIL
  // =========================
  const handleConfirm = async (event) => {
    event.preventDefault();

    setMessage('');
    setError('');
    setCodeError('');

    const trimmedCode = code.trim();

    if (!trimmedCode) {
      setCodeError('Vui lòng nhập mã xác nhận 6 số!');
      return;
    }

    if (!/^\d{6}$/.test(trimmedCode)) {
      setCodeError('Mã xác nhận phải gồm đúng 6 chữ số!');
      return;
    }

    try {
      setLoading(true);

      const response = await confirmChangeEmail(trimmedCode);

      setMessage(
        response.data ||
          'Đổi email tài khoản thành công! Bạn sẽ được chuyển hướng tới trang đăng nhập...',
      );

      // Backend đã thu hồi token cũ, xóa token local và đăng nhập lại
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      setTimeout(() => {
        navigate('/login', {
          replace: true,
        });
      }, 1500);
    } catch (err) {


      const data = err.response?.data;

      if (typeof data === 'string') {
        setError(data);
      } else {
        setError(data?.message || data?.error || 'Mã xác nhận không hợp lệ hoặc đã hết hạn!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-email-page">
      <div className="change-email-card">
        <header className="change-email-header">
          <div className="change-email-icon-wrapper">
            <Mail size={24} />
          </div>
          <div>
            <div className="change-email-pretitle">Tài khoản &bull; Liên lạc</div>
            <h1>Đổi địa chỉ email</h1>
            <p>Xác thực mã bảo mật gửi về hộp thư hiện tại trước khi cập nhật sang email mới.</p>
          </div>
        </header>

        {/* Step Progression Bar */}
        <div className="change-email-stepper">
          <div className={`step-item ${step >= 1 ? 'is-active' : ''}`}>
            <span className="step-num">1</span>
            <span className="step-label">Nhập email mới</span>
          </div>

          <div className={`step-connector ${step >= 2 ? 'is-active' : ''}`} />

          <div className={`step-item ${step >= 2 ? 'is-active' : ''}`}>
            <span className="step-num">2</span>
            <span className="step-label">Xác nhận mã</span>
          </div>
        </div>

        {error && (
          <div className="change-email-msg error">
            <AlertCircle size={18} className="msg-icon" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="change-email-msg success">
            <CheckCircle2 size={18} className="msg-icon" />
            <span>{message}</span>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestCode} noValidate className="change-email-form">
            <div className="change-email-current-box">
              <span className="current-label">Email hiện tại của tài khoản:</span>
              <strong className="current-value">{currentUser?.email || 'Chưa xác định'}</strong>
            </div>

            <div className="change-email-field">
              <label htmlFor="newEmail">Địa chỉ email mới *</label>
              <div className={`input-with-icon ${emailError ? 'has-error' : ''}`}>
                <Mail size={16} className="field-prefix-icon" />
                <input
                  id="newEmail"
                  type="email"
                  placeholder="reader.new@example.com"
                  value={newEmail}
                  onChange={(event) => {
                    setNewEmail(event.target.value);
                    if (emailError) setEmailError('');
                  }}
                />
              </div>
              {emailError && <span className="field-error-text">{emailError}</span>}
            </div>

            <div className="change-email-actions">
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
                <Send size={15} />
                <span>{loading ? 'Đang gửi mã...' : 'Gửi mã xác nhận'}</span>
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleConfirm} noValidate className="change-email-form">
            <div className="change-email-current-box highlight">
              <div>
                Mã xác nhận 6 chữ số đã được gửi tới:{' '}
                <strong>{currentUser?.email || 'email hiện tại'}</strong>
              </div>
              <div className="sub-note">
                Yêu cầu cập nhật sang địa chỉ mới: <strong>{newEmail}</strong>
              </div>
            </div>

            <div className="change-email-field">
              <label htmlFor="otpCode">Mã xác nhận (6 chữ số) *</label>
              <div className={`input-with-icon ${codeError ? 'has-error' : ''}`}>
                <KeyRound size={16} className="field-prefix-icon" />
                <input
                  id="otpCode"
                  type="text"
                  placeholder="123456"
                  value={code}
                  maxLength={6}
                  autoComplete="one-time-code"
                  onChange={(event) => {
                    const val = event.target.value.replace(/\D/g, '');
                    setCode(val);
                    if (codeError) setCodeError('');
                  }}
                />
              </div>
              {codeError && <span className="field-error-text">{codeError}</span>}
            </div>

            <div className="change-email-actions">
              <button
                type="button"
                className="btn btn-outline"
                disabled={loading}
                onClick={() => {
                  setStep(1);
                  setCode('');
                  setMessage('');
                  setError('');
                }}
              >
                <RefreshCw size={15} />
                <span>Đổi email khác</span>
              </button>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                <ShieldCheck size={15} />
                <span>{loading ? 'Đang xác nhận...' : 'Xác nhận cập nhật email'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
