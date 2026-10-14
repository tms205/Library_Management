import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/authApi';
import '../styles/auth.css';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
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

      navigate('/dashboard');

      console.log('Login response:', response.data);

      localStorage.setItem('accessToken', response.data.accessToken);

      setMessage('Đăng nhập thành công!');
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

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>

            <input
              type="email"
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

          {message && <p className="auth-message">{message}</p>}

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
