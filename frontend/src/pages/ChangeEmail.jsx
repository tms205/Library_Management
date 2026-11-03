import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestChangeEmail, confirmChangeEmail } from '../api/changeEmailApi';
import { getUserInfo } from '../utils/auth';

import '../styles/changeEmail.css';

function ChangeEmail() {
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
      setEmailError('Email không đúng định dạng (Ví dụ: user@example.com)!');
      return;
    }

    if (currentUser?.email && trimmed.toLowerCase() === currentUser.email.toLowerCase()) {
      setEmailError('Email mới không được trùng với email hiện tại!');
      return;
    }

    try {
      setLoading(true);

      const response = await requestChangeEmail(trimmed);

      setMessage(response.data || 'Mã xác nhận đã được gửi đến email hiện tại của bạn.');
      setStep(2);
    } catch (err) {
      console.error(err);

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
      setCodeError('Vui lòng nhập mã xác nhận!');
      return;
    }

    if (!/^\d{6}$/.test(trimmedCode)) {
      setCodeError('Mã xác nhận phải gồm đúng 6 chữ số!');
      return;
    }

    try {
      setLoading(true);

      const response = await confirmChangeEmail(code.trim());

      setMessage(response.data || 'Đổi email thành công! Đang chuyển hướng...');

      // Backend đã thu hồi token cũ, xóa token local và đăng nhập lại
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      setTimeout(() => {
        navigate('/login', {
          replace: true,
        });
      }, 1200);
    } catch (err) {
      console.error(err);

      const data = err.response?.data;

      if (typeof data === 'string') {
        setError(data);
      } else {
        setError(data?.message || data?.error || 'Mã xác nhận không hợp lệ!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-email-page">
      <div className="change-email-card">
        <div className="change-email-header">
          <p>Library / Account Settings</p>
          <h1>Đổi địa chỉ email</h1>
          <span>Xác minh mã bảo mật gửi về email hiện tại trước khi cập nhật sang địa chỉ mới.</span>
        </div>

        <div className="change-email-steps">
          <div className={step >= 1 ? 'change-email-step active' : 'change-email-step'}>
            1<span>Email mới</span>
          </div>

          <div className="change-email-line" />

          <div className={step >= 2 ? 'change-email-step active' : 'change-email-step'}>
            2<span>Xác nhận</span>
          </div>
        </div>

        {error && <div className="change-email-error">{error}</div>}
        {message && <div className="change-email-success">{message}</div>}

        {step === 1 && (
          <form onSubmit={handleRequestCode} noValidate>
            <div className="change-email-field">
              <label>Địa chỉ email mới *</label>
              <input
                type="email"
                className={emailError ? 'input-error' : ''}
                placeholder="example@gmail.com"
                value={newEmail}
                onChange={(event) => {
                  setNewEmail(event.target.value);
                  if (emailError) setEmailError('');
                }}
              />
              {emailError && <span className="field-error">{emailError}</span>}
            </div>

            <button type="submit" className="change-email-button" disabled={loading}>
              {loading ? 'Đang gửi mã...' : 'Gửi mã xác nhận'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleConfirm} noValidate>
            <div className="change-email-current">
              Mã xác nhận 6 số đã được gửi tới email hiện tại của bạn:
              <strong>{currentUser?.email || 'email hiện tại'}</strong>
              <div style={{ marginTop: '8px', fontSize: '15px', color: '#64748b' }}>
                (Yêu cầu đổi sang email mới: <strong>{newEmail}</strong>)
              </div>
            </div>

            <div className="change-email-field">
              <label>Mã xác nhận (6 số) *</label>
              <input
                type="text"
                className={codeError ? 'input-error' : ''}
                placeholder="Nhập mã xác nhận 6 số..."
                value={code}
                maxLength={6}
                onChange={(event) => {
                  const val = event.target.value.replace(/\D/g, '');
                  setCode(val);
                  if (codeError) setCodeError('');
                }}
              />
              {codeError && <span className="field-error">{codeError}</span>}
            </div>

            <button type="submit" className="change-email-button" disabled={loading}>
              {loading ? 'Đang xác nhận...' : 'Xác nhận cập nhật email'}
            </button>

            <button
              type="button"
              className="change-email-secondary"
              disabled={loading}
              onClick={() => {
                setStep(1);
                setCode('');
                setMessage('');
                setError('');
              }}
            >
              ← Thay đổi email khác
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ChangeEmail;
