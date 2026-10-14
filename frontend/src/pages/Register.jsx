import { useState } from 'react';
import { Link } from 'react-router-dom';

import { register } from '../api/authApi';
import '../styles/auth.css';

function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    dateOfBirth: '',
    phone: '',
    address: '',
  });

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };
  const handleRegister = async (event) => {
    event.preventDefault();

    setMessage('');

    if (
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.fullName ||
      !formData.dateOfBirth ||
      !formData.phone ||
      !formData.address
    ) {
      setMessage('Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage('Mật khẩu xác nhận không khớp!');
      return;
    }

    try {
      setLoading(true);

      const response = await register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        phone: formData.phone,
        address: formData.address,
      });

      console.log('Register response:', response.data);

      setMessage('Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản.');
    } catch (error) {
      console.error(error);

      const data = error.response?.data;

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
    <div className="auth-page">
      <div className="auth-box">

        <h1>Library Management</h1>

        <p className="auth-subtitle">Hệ thống quản lý thư viện</p>

        <h2>Đăng ký tài khoản</h2>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Họ và tên</label>

            <input
              type="text"
              name="fullName"
              placeholder="Nhập họ và tên"
              value={formData.fullName}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Email</label>

            <input
              type="email"
              name="email"
              placeholder="Nhập email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Ngày sinh</label>

            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Số điện thoại</label>

            <input
              type="text"
              name="phone"
              placeholder="Ví dụ: 0912345678"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Địa chỉ</label>

            <input
              type="text"
              name="address"
              placeholder="Nhập địa chỉ"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Mật khẩu</label>

            <input
              type="password"
              name="password"
              placeholder="Nhập mật khẩu"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Xác nhận mật khẩu</label>

            <input
              type="password"
              name="confirmPassword"
              placeholder="Nhập lại mật khẩu"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>

          {message && <p className="auth-message">{message}</p>}

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
