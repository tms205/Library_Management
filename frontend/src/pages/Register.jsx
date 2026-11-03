import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { register } from '../api/authApi';
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
      console.error(error);

      const data = error.response?.data;

      setMessageType('error');

      if (data?.message) {
        setMessage(data.message);
      } else if (data && typeof data === 'object') {
        const firstError = Object.values(data)[0];

        setMessage(firstError || 'Đăng ký thất bại!');
      } else {
        setMessage('Không thể kết nối đến server!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page register-page">
      <div className="auth-box">
        <h1>Library Management</h1>

        <p className="auth-subtitle">Hệ thống quản lý thư viện</p>

        <h2>Đăng ký tài khoản</h2>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Họ và tên *</label>

            <input
              type="text"
              name="fullName"
              className={errors.fullName ? 'input-error' : ''}
              placeholder="Nhập họ và tên"
              value={formData.fullName}
              onChange={handleChange}
            />
            {errors.fullName && <span className="field-error">{errors.fullName}</span>}
          </div>

          <div className="form-group">
            <label>Email *</label>

            <input
              type="email"
              name="email"
              className={errors.email ? 'input-error' : ''}
              placeholder="Nhập email (ví dụ: user@example.com)"
              value={formData.email}
              onChange={handleChange}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label>Ngày sinh *</label>

            <input
              type="date"
              name="dateOfBirth"
              className={errors.dateOfBirth ? 'input-error' : ''}
              value={formData.dateOfBirth}
              onChange={handleChange}
            />
            {errors.dateOfBirth && <span className="field-error">{errors.dateOfBirth}</span>}
          </div>

          <div className="form-group">
            <label>Số điện thoại *</label>

            <input
              type="text"
              name="phone"
              className={errors.phone ? 'input-error' : ''}
              placeholder="Ví dụ: 0912345678"
              value={formData.phone}
              onChange={handleChange}
            />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label>Địa chỉ *</label>

            <input
              type="text"
              name="address"
              className={errors.address ? 'input-error' : ''}
              placeholder="Nhập địa chỉ"
              value={formData.address}
              onChange={handleChange}
            />
            {errors.address && <span className="field-error">{errors.address}</span>}
          </div>

          <div className="form-group">
            <label>Mật khẩu *</label>

            <input
              type="password"
              name="password"
              className={errors.password ? 'input-error' : ''}
              placeholder="Nhập mật khẩu (tối thiểu 4 ký tự)"
              value={formData.password}
              onChange={handleChange}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label>Xác nhận mật khẩu *</label>

            <input
              type="password"
              name="confirmPassword"
              className={errors.confirmPassword ? 'input-error' : ''}
              placeholder="Nhập lại mật khẩu"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
          </div>

          {message && <p className={`auth-message ${messageType}`}>{message}</p>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        <p className="auth-link">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
