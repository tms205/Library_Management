import AuthStory from '../components/AuthStory';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Library, AlertCircle, CheckCircle2, User, Mail, Calendar, Phone, MapPin, Lock } from 'lucide-react';
import { register } from '../api/authApi';
import ThemeToggle from '../components/ThemeToggle';
import '../styles/auth.css';

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    dateOfBirth: '',
    phone: '',
    address: '',
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const err = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^0\d{9}$/;

    if (!formData.fullName.trim()) {
      err.fullName = 'Họ và tên không được để trống!';
    } else if (formData.fullName.trim().length < 2) {
      err.fullName = 'Họ và tên phải có ít nhất 2 ký tự!';
    }

    if (!formData.email.trim()) {
      err.email = 'Email không được để trống!';
    } else if (!emailRegex.test(formData.email.trim())) {
      err.email = 'Email không đúng định dạng (Ví dụ: user@example.com)!';
    }

    if (!formData.dateOfBirth) {
      err.dateOfBirth = 'Ngày sinh không được để trống!';
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (birthDate >= today) {
        err.dateOfBirth = 'Ngày sinh phải là ngày trong quá khứ!';
      }
    }

    if (!formData.phone.trim()) {
      err.phone = 'Số điện thoại không được để trống!';
    } else if (!phoneRegex.test(formData.phone.trim())) {
      err.phone = 'Số điện thoại phải gồm 10 số và bắt đầu bằng số 0 (Ví dụ: 0912345678)!';
    }

    if (!formData.address.trim()) {
      err.address = 'Địa chỉ không được để trống!';
    }

    if (!formData.password) {
      err.password = 'Mật khẩu không được để trống!';
    } else if (formData.password.length < 4) {
      err.password = 'Mật khẩu phải có ít nhất 4 ký tự!';
    }

    if (!formData.confirmPassword) {
      err.confirmPassword = 'Vui lòng xác nhận lại mật khẩu!';
    } else if (formData.password !== formData.confirmPassword) {
      err.confirmPassword = 'Mật khẩu xác nhận không khớp!';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    if (loading) return;

    setMessage('');
    setMessageType('');

    if (!validateForm()) {
      setMessage('Vui lòng kiểm tra và sửa các thông tin chưa chính xác bên dưới!');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);

      await register({
        email: formData.email.trim(),
        password: formData.password,
        fullName: formData.fullName.trim(),
        dateOfBirth: formData.dateOfBirth,
        phone: formData.phone.trim(),
        address: formData.address.trim(),
      });

      setMessage('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.');
      setMessageType('success');

      setTimeout(() => {
        navigate(`/login?email=${encodeURIComponent(formData.email.trim())}&registered=true`);
      }, 1800);
    } catch (error) {

      const data = error.response?.data;
      setMessageType('error');

      if (data?.message) {
        setMessage(data.message);
      } else if (data && typeof data === 'object') {
        const firstError = Object.values(data)[0];
        setMessage(firstError || 'Đăng ký thất bại!');
      } else {
        setMessage('Không thể kết nối đến máy chủ thư viện!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page register-page">
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
          <h1>Đăng ký thẻ bạn đọc</h1>
          <p className="auth-subtitle">Tạo tài khoản để mượn sách và trải nghiệm thư viện số</p>
        </div>

        {message && (
          <div className={`auth-alert ${messageType === 'success' ? 'auth-alert-success' : 'auth-alert-error'}`} role="alert">
            {messageType === 'success' ? <CheckCircle2 size={18} className="auth-alert-icon" /> : <AlertCircle size={18} className="auth-alert-icon" />}
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="auth-form" noValidate>
          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="reg-fullname">Họ và tên *</label>
            <div className="auth-input-wrapper">
              <User size={17} className="auth-input-leading-icon" />
              <input
                id="reg-fullname"
                type="text"
                name="fullName"
                className={errors.fullName ? 'input-error with-leading-icon' : 'with-leading-icon'}
                placeholder="Nhập họ và tên đầy đủ..."
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>
            {errors.fullName && <span className="field-error"><AlertCircle size={13} />{errors.fullName}</span>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="reg-email">Email bạn đọc *</label>
            <div className="auth-input-wrapper">
              <Mail size={17} className="auth-input-leading-icon" />
              <input
                id="reg-email"
                type="email"
                name="email"
                className={errors.email ? 'input-error with-leading-icon' : 'with-leading-icon'}
                placeholder="Nhập email (ví dụ: user@example.com)"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            {errors.email && <span className="field-error"><AlertCircle size={13} />{errors.email}</span>}
          </div>

          {/* Row: Date of birth & Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label htmlFor="reg-dob">Ngày sinh *</label>
              <div className="auth-input-wrapper">
                <Calendar size={17} className="auth-input-leading-icon" />
                <input
                  id="reg-dob"
                  type="date"
                  name="dateOfBirth"
                  className={errors.dateOfBirth ? 'input-error with-leading-icon' : 'with-leading-icon'}
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
              </div>
              {errors.dateOfBirth && <span className="field-error"><AlertCircle size={13} />{errors.dateOfBirth}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="reg-phone">Số điện thoại *</label>
              <div className="auth-input-wrapper">
                <Phone size={17} className="auth-input-leading-icon" />
                <input
                  id="reg-phone"
                  type="text"
                  name="phone"
                  className={errors.phone ? 'input-error with-leading-icon' : 'with-leading-icon'}
                  placeholder="0912345678"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              {errors.phone && <span className="field-error"><AlertCircle size={13} />{errors.phone}</span>}
            </div>
          </div>

          {/* Address */}
          <div className="form-group">
            <label htmlFor="reg-address">Địa chỉ thường trú *</label>
            <div className="auth-input-wrapper">
              <MapPin size={17} className="auth-input-leading-icon" />
              <input
                id="reg-address"
                type="text"
                name="address"
                className={errors.address ? 'input-error with-leading-icon' : 'with-leading-icon'}
                placeholder="Nhập địa chỉ của bạn..."
                value={formData.address}
                onChange={handleChange}
              />
            </div>
            {errors.address && <span className="field-error"><AlertCircle size={13} />{errors.address}</span>}
          </div>

          {/* Password & Confirm Password */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label htmlFor="reg-password">Mật khẩu *</label>
              <div className="auth-input-wrapper">
                <Lock size={17} className="auth-input-leading-icon" />
                <input
                  id="reg-password"
                  type="password"
                  name="password"
                  className={errors.password ? 'input-error with-leading-icon' : 'with-leading-icon'}
                  placeholder="Tối thiểu 4 ký tự"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
              {errors.password && <span className="field-error"><AlertCircle size={13} />{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="reg-confirm">Xác nhận mật khẩu *</label>
              <div className="auth-input-wrapper">
                <Lock size={17} className="auth-input-leading-icon" />
                <input
                  id="reg-confirm"
                  type="password"
                  name="confirmPassword"
                  className={errors.confirmPassword ? 'input-error with-leading-icon' : 'with-leading-icon'}
                  placeholder="Nhập lại mật khẩu"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
              {errors.confirmPassword && <span className="field-error"><AlertCircle size={13} />{errors.confirmPassword}</span>}
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? (
              <span className="auth-btn-loading">
                <span className="auth-spinner" />
                Đang xử lý đăng ký...
              </span>
            ) : (
              'Hoàn tất đăng ký thẻ bạn đọc'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>Đã có tài khoản bạn đọc?</span>
          <Link to="/login" className="auth-link-bold">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
