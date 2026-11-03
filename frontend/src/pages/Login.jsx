import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { login } from '../api/authApi';
import '../styles/auth.css';

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const registeredEmail = searchParams.get('email') || '';
  const registered = searchParams.get('registered') === 'true';

  const [email, setEmail] = useState(registeredEmail);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const err = {};
    const emailOrAdminRegex = /^(admin|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

    if (!email.trim()) {
      err.email = 'Vui lòng nhập email hoặc tài khoản admin!';
    } else if (!emailOrAdminRegex.test(email.trim())) {
      err.email = 'Email không đúng định dạng (Ví dụ: user@example.com)!';
    }

    if (!password) {
      err.password = 'Vui lòng nhập mật khẩu!';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    setMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const response = await login({
        email: email.trim(),
        password: password,
      });

      localStorage.setItem('accessToken', response.data.accessToken);

      localStorage.setItem('refreshToken', response.data.refreshToken);

      console.log('Login response:', response.data);

      navigate('/dashboard');
    } catch (error) {
      console.error(error);

      if (error.response) {
        setMessage(error.response.data?.message || 'Email hoặc mật khẩu không chính xác!');
      } else {
        setMessage('Không thể kết nối đến server!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h1>Library Management</h1>

        <p className="auth-subtitle">Hệ thống quản lý thư viện</p>

        <h2>Đăng nhập</h2>

        {registered && (
          <p className="auth-message success">
            Đăng ký thành công!
            <br />
            Vui lòng kiểm tra email để xác thực tài khoản trước khi đăng nhập.
          </p>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email / Tài khoản</label>

            <input
              type="text"
              className={errors.email ? 'input-error' : ''}
              placeholder="Nhập email hoặc admin"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
              }}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label>Mật khẩu</label>

            <input
              type="password"
              className={errors.password ? 'input-error' : ''}
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
              }}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <p className="auth-link" style={{ textAlign: 'right' }}>
            <Link to="/forgot-password">Quên mật khẩu?</Link>
          </p>

          {message && <p className="auth-message error">{message}</p>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="auth-link">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
