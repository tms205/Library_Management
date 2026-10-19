import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { searchMembers, createMember, updateMember, deleteMember } from '../api/memberApi';

import '../styles/members.css';

function MemberManagement() {
  const [members, setMembers] = useState([]);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [searchFilters, setSearchFilters] = useState({
    fullName: '',
    phone: '',
    address: '',
  });

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  const [formData, setFormData] = useState({
    accountId: '',
    fullName: '',
    dateOfBirth: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    let cancelled = false;

    const loadMembers = async () => {
      try {
        const response = await searchMembers({
          fullName: searchFilters.fullName || undefined,
          phone: searchFilters.phone || undefined,
          address: searchFilters.address || undefined,
          page,
          size: 10,
          sortBy: 'fullName',
          direction: 'asc',
        });

        if (cancelled) {
          return;
        }

        const data = response.data;

        if (Array.isArray(data?.content)) {
          setMembers(data.content);
          setTotalPages(data.totalPages ?? 0);
        } else if (Array.isArray(data)) {
          setMembers(data);
          setTotalPages(data.length > 0 ? 1 : 0);
        } else {
          setMembers([]);
          setTotalPages(0);
        }

        setMessage('');
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(error);

        setMembers([]);
        setTotalPages(0);
        setMessageType('error');

        setMessage(error.response?.data?.message || 'Không thể tải danh sách thành viên!');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [page, searchFilters.fullName, searchFilters.phone, searchFilters.address]);

  const handleSearch = (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage('');
    setPage(0);

    setSearchFilters({
      fullName: fullName.trim(),
      phone: phone.trim(),
      address: address.trim(),
    });
  };

  const handleResetSearch = () => {
    setFullName('');
    setPhone('');
    setAddress('');

    setLoading(true);
    setPage(0);

    setSearchFilters({
      fullName: '',
      phone: '',
      address: '',
    });
  };

  const openCreateForm = () => {
    setEditingMember(null);

    setFormData({
      accountId: '',
      fullName: '',
      dateOfBirth: '',
      phone: '',
      address: '',
    });

    setShowForm(true);
  };

  const openEditForm = (member) => {
    setEditingMember(member);

    setFormData({
      accountId: member.accountId || '',
      fullName: member.fullName || '',
      dateOfBirth: member.dateOfBirth || '',
      phone: member.phone || '',
      address: member.address || '',
    });

    setShowForm(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const reloadCurrentPage = async () => {
    try {
      setLoading(true);

      const response = await searchMembers({
        fullName: searchFilters.fullName || undefined,
        phone: searchFilters.phone || undefined,
        address: searchFilters.address || undefined,
        page,
        size: 10,
        sortBy: 'fullName',
        direction: 'asc',
      });

      const data = response.data;

      if (Array.isArray(data?.content)) {
        setMembers(data.content);
        setTotalPages(data.totalPages ?? 0);
      } else if (Array.isArray(data)) {
        setMembers(data);
        setTotalPages(data.length > 0 ? 1 : 0);
      }
    } catch (error) {
      console.error(error);

      setMessageType('error');
      setMessage(error.response?.data?.message || 'Không thể tải lại danh sách thành viên!');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      if (editingMember) {
        await updateMember(editingMember.id, {
          fullName: formData.fullName.trim(),
          dateOfBirth: formData.dateOfBirth,
          phone: formData.phone.trim(),
          address: formData.address.trim(),
        });

        setMessageType('success');
        setMessage('Cập nhật thành viên thành công.');
      } else {
        await createMember({
          accountId: Number(formData.accountId),
          fullName: formData.fullName.trim(),
          dateOfBirth: formData.dateOfBirth,
          phone: formData.phone.trim(),
          address: formData.address.trim(),
        });

        setMessageType('success');
        setMessage('Thêm thành viên thành công.');
      }

      setShowForm(false);

      await reloadCurrentPage();
    } catch (error) {
      console.error(error);

      const data = error.response?.data;

      setMessageType('error');

      if (typeof data === 'string') {
        setMessage(data);
      } else if (data?.message) {
        setMessage(data.message);
      } else if (data?.error) {
        setMessage(data.error);
      } else if (data && typeof data === 'object') {
        const fieldErrors = Object.entries(data)
          .filter(([key]) => !['timestamp', 'status', 'error', 'path'].includes(key))
          .map(([, value]) => value);

        setMessage(fieldErrors[0] || 'Dữ liệu thành viên không hợp lệ!');
      } else {
        setMessage('Có lỗi xảy ra!');
      }
    }
  };

  const handleDelete = async (member) => {
    const confirmed = window.confirm(`Bạn có chắc muốn xóa thành viên "${member.fullName}" không?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteMember(member.id);

      setMessageType('success');
      setMessage('Xóa thành viên thành công.');

      await reloadCurrentPage();
    } catch (error) {
      console.error(error);

      setMessageType('error');
      setMessage(error.response?.data?.message || 'Không thể xóa thành viên!');
    }
  };

  return (
    <main className="member-page">
      <div className="member-page-wrapper">
        <header className="member-page-header">
          <div>
            <div className="member-page-pretitle">Library / Members</div>

            <h1>Quản lý thành viên</h1>

            <p>Quản lý thông tin cá nhân và tài khoản thành viên thư viện.</p>
          </div>

          <div className="member-page-actions">
            <Link to="/dashboard" className="member-btn member-btn-home">
              <span>←</span>
              Trang chủ
            </Link>

            <button
              type="button"
              className="member-btn member-btn-primary"
              onClick={openCreateForm}
            >
              <span>＋</span>
              Thêm thành viên
            </button>
          </div>
        </header>

        {message && (
          <div
            className={`member-alert ${
              messageType === 'error' ? 'member-alert-error' : 'member-alert-success'
            }`}
          >
            <span className="member-alert-dot" />
            <span>{message}</span>

            <button type="button" onClick={() => setMessage('')} aria-label="Đóng thông báo">
              ×
            </button>
          </div>
        )}

        <section className="member-card">
          <div className="member-card-header">
            <div>
              <h2>Bộ lọc tìm kiếm</h2>
              <p>Tìm theo họ tên, số điện thoại hoặc địa chỉ</p>
            </div>
          </div>

          <div className="member-card-body">
            <form className="member-filter-form" onSubmit={handleSearch}>
              <div className="member-field">
                <label>Họ và tên</label>

                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </div>

              <div className="member-field">
                <label>Số điện thoại</label>

                <input
                  type="text"
                  placeholder="Nhập số điện thoại..."
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>

              <div className="member-field">
                <label>Địa chỉ</label>

                <input
                  type="text"
                  placeholder="Nhập địa chỉ..."
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
              </div>

              <div className="member-filter-actions">
                <button
                  type="button"
                  className="member-btn member-btn-outline"
                  onClick={handleResetSearch}
                >
                  Đặt lại
                </button>

                <button type="submit" className="member-btn member-btn-primary">
                  Tìm kiếm
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="member-card">
          <div className="member-card-header">
            <div>
              <h2>Danh sách thành viên</h2>
              <p>Tối đa 10 thành viên mỗi trang</p>
            </div>

            <div className="member-page-count">
              Trang {totalPages === 0 ? 0 : page + 1}
              {' / '}
              {totalPages}
            </div>
          </div>

          <div className="member-table-container">
            {loading ? (
              <div className="member-loading">
                <span className="member-spinner" />
                Đang tải dữ liệu...
              </div>
            ) : (
              <div className="member-table-wrapper">
                <table className="member-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Thành viên</th>
                      <th>Email</th>
                      <th>Ngày sinh</th>
                      <th>Điện thoại</th>
                      <th>Địa chỉ</th>
                      <th>Account ID</th>
                      <th className="member-action-heading">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody>
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan="8">
                          <div className="member-empty">
                            <div className="member-empty-icon">M</div>

                            <strong>Không tìm thấy thành viên</strong>

                            <span>Hãy thử thay đổi bộ lọc hoặc thêm thành viên mới.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      members.map((member) => (
                        <tr key={member.id}>
                          <td className="member-mono">#{member.id}</td>

                          <td>
                            <div className="member-person">
                              <div className="member-avatar">
                                {member.fullName?.trim().charAt(0).toUpperCase() || 'M'}
                              </div>

                              <span>{member.fullName}</span>
                            </div>
                          </td>

                          <td>{member.email || '—'}</td>

                          <td>{member.dateOfBirth || '—'}</td>

                          <td>{member.phone || '—'}</td>

                          <td className="member-address">{member.address || '—'}</td>

                          <td className="member-mono">
                            {member.accountId ? `#${member.accountId}` : '—'}
                          </td>

                          <td>
                            <div className="member-row-actions">
                              <button
                                type="button"
                                className="member-action-btn"
                                onClick={() => openEditForm(member)}
                              >
                                Sửa
                              </button>

                              <button
                                type="button"
                                className="member-action-btn member-action-danger"
                                onClick={() => handleDelete(member)}
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="member-card-footer">
            <span>
              {members.length > 0
                ? `Hiển thị ${members.length} thành viên trên trang này`
                : 'Không có dữ liệu'}
            </span>

            <div className="member-pagination">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => {
                  setLoading(true);
                  setPage((current) => current - 1);
                }}
              >
                ‹
              </button>

              <span>{totalPages === 0 ? 0 : page + 1}</span>

              <button
                type="button"
                disabled={totalPages === 0 || page >= totalPages - 1}
                onClick={() => {
                  setLoading(true);
                  setPage((current) => current + 1);
                }}
              >
                ›
              </button>
            </div>
          </div>
        </section>
      </div>

      {showForm && (
        <div
          className="member-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowForm(false);
            }
          }}
        >
          <div className="member-modal" role="dialog" aria-modal="true">
            <div className="member-modal-header">
              <div>
                <span>MEMBER</span>

                <h2>{editingMember ? 'Cập nhật thành viên' : 'Thêm thành viên mới'}</h2>
              </div>

              <button type="button" onClick={() => setShowForm(false)}>
                ×
              </button>
            </div>

            <form className="member-form" onSubmit={handleSubmit}>
              {!editingMember && (
                <div className="member-field">
                  <label>Account ID</label>

                  <input
                    type="number"
                    name="accountId"
                    min="1"
                    placeholder="Nhập ID tài khoản đã tồn tại"
                    value={formData.accountId}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}

              <div className="member-field">
                <label>Họ và tên</label>

                <input
                  type="text"
                  name="fullName"
                  placeholder="Nhập họ và tên"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="member-form-grid">
                <div className="member-field">
                  <label>Ngày sinh</label>

                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="member-field">
                  <label>Số điện thoại</label>

                  <input
                    type="text"
                    name="phone"
                    placeholder="Nhập số điện thoại"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="member-field">
                <label>Địa chỉ</label>

                <input
                  type="text"
                  name="address"
                  placeholder="Nhập địa chỉ"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="member-modal-footer">
                <button
                  type="button"
                  className="member-btn member-btn-outline"
                  onClick={() => setShowForm(false)}
                >
                  Hủy
                </button>

                <button type="submit" className="member-btn member-btn-primary">
                  {editingMember ? 'Lưu thay đổi' : 'Thêm thành viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default MemberManagement;
