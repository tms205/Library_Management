import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { requestChangeEmail, confirmChangeEmail } from '../api/changeEmailApi';

import '../styles/changeEmail.css';

function ChangeEmail() {
  const navigate = useNavigate();

  const [newEmail, setNewEmail] = useState('');

  const [code, setCode] = useState('');

  const [step, setStep] = useState(1);

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState('');

  const [error, setError] = useState('');

  // =========================
  // GUI MA XAC NHAN
  // =========================

  const handleRequestCode = async (event) => {
    event.preventDefault();

    setMessage('');
    setError('');

    if (!newEmail.trim()) {
      setError('Vui lòng nhập email mới!');

      return;
    }

    try {
      setLoading(true);

      const response = await requestChangeEmail(newEmail.trim());

      setMessage(response.data);

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
  // XAC NHAN DOI EMAIL
  // =========================

  const handleConfirm = async (event) => {
    event.preventDefault();

    setMessage('');
    setError('');

    if (!code.trim()) {
      setError('Vui lòng nhập mã xác nhận!');

      return;
    }

    try {
      setLoading(true);

      const response = await confirmChangeEmail(code.trim());

      setMessage(response.data);

      // Backend da blacklist token cu
      localStorage.removeItem('accessToken');

      localStorage.removeItem('refreshToken');

      // Cho user thay thong bao 1 giay
      // roi ve login
      setTimeout(() => {
        navigate('/login', {
          replace: true,
        });
      }, 1000);
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
    <main className="change-email-page">
      <div className="change-email-card">
        <div className="change-email-header">
          <p>Library / Account</p>

          <h1>Đổi email</h1>

          <span>Xác minh email mới trước khi cập nhật tài khoản.</span>
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
          <form onSubmit={handleRequestCode}>
            <div className="change-email-field">
              <label>Email mới</label>

              <input
                type="email"
                placeholder="example@gmail.com"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
              />
            </div>

            <button type="submit" className="change-email-button" disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleConfirm}>
            <div className="change-email-current">
              Mã xác nhận đã được gửi tới:
              <strong>{newEmail}</strong>
            </div>

            <div className="change-email-field">
              <label>Mã xác nhận</label>

              <input
                type="text"
                placeholder="Nhập mã xác nhận"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>

            <button type="submit" className="change-email-button" disabled={loading}>
              {loading ? 'Đang xác nhận...' : 'Xác nhận đổi email'}
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
              ← Đổi email khác
            </button>
          </form>
        )}

        <Link to="/dashboard" className="change-email-back">
          ← Quay lại trang chủ
        </Link>
      </div>
    </main>
  );
}

export default ChangeEmail;
