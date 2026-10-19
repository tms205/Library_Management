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

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setMessage('');

    if (!email || !password) {
      setMessage('Vui lòng nhập đầy đủ email và mật khẩu!');
      return;
    }

    try {
      setLoading(true);

      const response = await login({
        email: email,
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
            <label>Email</label>

            <input
              type="text"
              placeholder="Nhập email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Mật khẩu</label>

            <input
              type="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
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
