import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Lock, Mail } from 'lucide-react';
import { login } from '../api/authApi';
import ThemeToggle from '../components/ThemeToggle';
import BookStage from '../components/BookStage';
import CinematicBackground3D from '../components/CinematicBackground3D';
import '../styles/auth.css';

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const registeredEmail = searchParams.get('email') || '';
  const registered = searchParams.get('registered') === 'true';

  const [email, setEmail] = useState(registeredEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    if (loading) return;
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

      if (!response.data?.accessToken || !response.data?.refreshToken) {
        throw new Error('Phản hồi đăng nhập không hợp lệ.');
      }
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);

      navigate('/dashboard');
    } catch (error) {
      if (error.response) {
        setMessage(error.response.data?.message || 'Email hoặc mật khẩu không chính xác!');
      } else {
        setMessage('Không thể kết nối đến máy chủ thư viện!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page-cinematic">
      {/* Hiệu ứng Quả cầu dây 3D Geodesic Wireframe Sphere xoay mượt mà & phản hồi chuột theo video */}
      <CinematicBackground3D />

      {/* Top Action: Đổi giao diện Sáng / Tối */}
      <div className="auth-top-actions">
        <ThemeToggle />
      </div>

      {/* Toàn bộ nội dung căn giữa màn hình */}
      <div className="login-centered-container">
        {/* Tag trạng thái phát quang phong cách ảnh 3 */}
        <div className="cinematic-tag">
          <span className="cinematic-tag-dot" />
          <span>KHÔNG GIAN TRI THỨC</span>
        </div>

        {/* 1. KHỐI 3D SÁCH TƯƠNG TÁC ĐẦU TRANG (Ảnh 4) - Giữ kích thước tiêu chuẩn cho Login */}
        <div className="login-bookstage-frame">
          <BookStage isLogin={true} />
        </div>

        {/* 2. KHỐI THÔNG ĐIỆP CINEMATIC THEO YÊU CẦU */}
        <div className="login-hero-typography">
          <h2 className="login-hero-title">MỖI TRANG SÁCH, MỘT KHỞI ĐẦU</h2>
          <div className="login-hero-quote">
            <p className="login-quote-main">Mở một cuốn sách. Mở thêm một chân trời.</p>
            <p className="login-quote-sub">
              Không gian dành cho sự tò mò, những ý tưởng mới và hành trình đọc của riêng bạn.
            </p>
          </div>
        </div>

        {/* 3. FORM ĐĂNG NHẬP Ở GIỮA MÀN HÌNH VÀ PHÓNG TO */}
        <div className="auth-box login-enlarged-box">
          <div className="auth-header-text">
            <h1>Đăng nhập tài khoản</h1>
            <p className="auth-subtitle">Nhập thông tin xác thực để truy cập hệ thống quản lý thư viện</p>
          </div>

          {registered && (
            <div className="auth-alert auth-alert-success" role="alert">
              <CheckCircle2 size={18} className="auth-alert-icon" />
              <div>
                <strong>Đăng ký tài khoản thành công!</strong>
                <p>Vui lòng kiểm tra email để xác thực tài khoản trước khi đăng nhập.</p>
              </div>
            </div>
          )}

          {message && (
            <div className="auth-alert auth-alert-error" role="alert">
              <AlertCircle size={18} className="auth-alert-icon" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="auth-form" noValidate>
            {/* Trường Email hoặc Admin */}
            <div className="form-group">
              <label htmlFor="login-email">Email hoặc Tài khoản quản trị</label>
              <div className="auth-input-wrapper">
                <Mail size={19} className="auth-input-leading-icon" />
                <input
                  id="login-email"
                  type="text"
                  className={errors.email ? 'input-error with-leading-icon' : 'with-leading-icon'}
                  placeholder="Nhập email độc giả hoặc admin..."
                  value={email}
                  autoComplete="username"
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                  }}
                />
              </div>
              {errors.email && (
                <span className="field-error">
                  <AlertCircle size={13} />
                  {errors.email}
                </span>
              )}
            </div>

            {/* Trường Mật khẩu */}
            <div className="form-group">
              <div className="auth-field-header-row">
                <label htmlFor="login-password">Mật khẩu</label>
                <Link to="/forgot-password" className="auth-link-subtle">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="auth-input-wrapper">
                <Lock size={19} className="auth-input-leading-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={errors.password ? 'input-error with-leading-icon with-trailing-btn' : 'with-leading-icon with-trailing-btn'}
                  placeholder="Nhập mật khẩu của bạn..."
                  value={password}
                  autoComplete="current-password"
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                />
                <button
                  type="button"
                  className="auth-password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <span className="field-error">
                  <AlertCircle size={13} />
                  {errors.password}
                </span>
              )}
            </div>

            {/* Nút Đăng nhập phóng to */}
            <button type="submit" className="auth-button login-btn-large" disabled={loading}>
              {loading ? (
                <span className="auth-btn-loading">
                  <span className="auth-spinner" />
                  Đang xử lý đăng nhập...
                </span>
              ) : (
                'Đăng nhập vào hệ thống'
              )}
            </button>
          </form>

          {/* Liên kết phụ */}
          <div className="auth-verify-link">
            <Link to="/verify-email">Xác thực tài khoản bằng mã OTP</Link>
          </div>
          <div className="auth-footer">
            <span>Bạn chưa có tài khoản?</span>
            <Link to="/register" className="auth-link-bold">
              Đăng ký thẻ bạn đọc mới
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
