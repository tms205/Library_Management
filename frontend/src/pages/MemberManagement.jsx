import { useEffect, useState } from 'react';
import { searchMembers, createMember, updateMember, deleteMember, toggleMemberStatus } from '../api/memberApi';
import { hasPermission } from '../utils/auth';

import '../styles/members.css';

// Kiểm tra tài khoản Quản trị viên (Admin) để không hiển thị trong danh sách độc giả thư viện
const isMemberAdmin = (m) => {
  if (!m) return false;
  return (
    m.role === 'ADMIN' ||
    m.email?.toLowerCase() === 'admin' ||
    m.fullName?.toLowerCase() === 'admin' ||
    m.accountId === 1
  );
};

function MemberManagement() {
  // Quyền hạn thực tế từ JWT
  const canCreate = hasPermission('MEMBER_CREATE');
  const canUpdate = hasPermission('MEMBER_UPDATE');
  const canDelete = hasPermission('MEMBER_DELETE');
  const hasRowActions = canUpdate || canDelete;

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

  const [formErrors, setFormErrors] = useState({});

  const loadMembers = async (targetPage = 0, filters = searchFilters) => {
    try {
      setLoading(true);
      const response = await searchMembers({
        fullName: filters.fullName?.trim() || undefined,
        phone: filters.phone?.trim() || undefined,
        address: filters.address?.trim() || undefined,
        page: targetPage,
        size: 10,
        sortBy: 'fullName',
        direction: 'asc',
      });

      const data = response.data;

      let list = [];
      if (Array.isArray(data?.content)) {
        list = data.content;
        setTotalPages(data.totalPages ?? 0);
      } else if (Array.isArray(data)) {
        list = data;
        setTotalPages(data.length > 0 ? 1 : 0);
      } else {
        setTotalPages(0);
      }

      // Ẩn các tài khoản Admin và các thành viên đã bị xóa (is_delete = 1)
      const visible = list.filter(
        (m) => m.is_delete !== 1 && m.isDelete !== 1 && !isMemberAdmin(m)
      );
      setMembers(visible);
      setPage(targetPage);
      setMessage('');
    } catch (error) {
      console.error(error);

      setMembers([]);
      setTotalPages(0);
      setMessageType('error');

      setMessage(error.response?.data?.message || 'Không thể tải danh sách thành viên!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers(0, { fullName: '', phone: '', address: '' });
  }, []);

  const handleSearch = (event) => {
    event?.preventDefault();

    setMessage('');

    const nextFilters = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      address: address.trim(),
    };

    setSearchFilters(nextFilters);
    loadMembers(0, nextFilters);
  };

  const handleResetSearch = () => {
    setFullName('');
    setPhone('');
    setAddress('');
    setMessage('');

    const emptyFilters = {
      fullName: '',
      phone: '',
      address: '',
    };

    setSearchFilters(emptyFilters);
    loadMembers(0, emptyFilters);
  };

  const openCreateForm = () => {
    setEditingMember(null);
    setFormErrors({});

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
    setFormErrors({});

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

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateModalForm = () => {
    const err = {};
    const phoneRegex = /^0\d{9}$/;

    if (!editingMember) {
      if (!formData.accountId || Number(formData.accountId) <= 0) {
        err.accountId = 'Vui lòng nhập Account ID hợp lệ (> 0)!';
      }
    }

    if (!formData.fullName.trim()) {
      err.fullName = 'Họ và tên không được để trống!';
    } else if (formData.fullName.trim().length < 2) {
      err.fullName = 'Họ và tên phải có ít nhất 2 ký tự!';
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

    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const reloadCurrentPage = async () => {
    await loadMembers(page, searchFilters);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateModalForm()) {
      return;
    }

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
      setMessage(`Xóa thành viên "${member.fullName}" thành công.`);

      // Ẩn ngay lập tức dòng thành viên bị xóa trên giao diện
      setMembers((prev) => prev.filter((m) => m.id !== member.id));

      await reloadCurrentPage();
    } catch (error) {
      console.error(error);

      setMessageType('error');
      setMessage(error.response?.data?.message || 'Không thể xóa thành viên!');
    }
  };

  // Khóa hoặc mở khóa tài khoản độc giả (giúp bảo lưu lịch sử mượn trả thay vì xóa)
  const handleToggleLock = async (member) => {
    const isCurrentlyActive = member.enabled !== false;
    const actionText = isCurrentlyActive ? 'khóa' : 'mở khóa';
    const confirmPrompt = isCurrentlyActive
      ? `Bạn có chắc chắn muốn KHÓA tài khoản của "${member.fullName}" không?\n\nSau khi khóa, độc giả này sẽ không thể đăng nhập hoặc mượn sách, nhưng toàn bộ lịch sử mượn trả cũ vẫn được bảo lưu nguyên vẹn.`
      : `Bạn có muốn MỞ KHÓA tài khoản của "${member.fullName}" để độc giả có thể tiếp tục sử dụng thư viện?`;

    if (!window.confirm(confirmPrompt)) {
      return;
    }

    try {
      await toggleMemberStatus(member.id, !isCurrentlyActive);

      setMessageType('success');
      setMessage(`Đã ${actionText} tài khoản thành viên "${member.fullName}" thành công.`);

      await reloadCurrentPage();
    } catch (error) {
      console.error(error);

      setMessageType('error');
      setMessage(error.response?.data?.message || `Không thể ${actionText} tài khoản thành viên!`);
    }
  };

  return (
    <div className="member-page">
      <div className="member-page-wrapper">
        <header className="member-page-header">
          <div>
            <div className="member-page-pretitle">Library / Members</div>
            <h1>Quản lý thành viên</h1>
            <p>Quản lý thông tin hồ sơ độc giả và tài khoản thành viên thư viện.</p>
          </div>

          <div className="member-page-actions">
            {/* MEMBER_CREATE: Chỉ hiển thị nút Thêm thành viên khi có quyền */}
            {canCreate && (
              <button
                type="button"
                className="member-btn member-btn-primary"
                onClick={openCreateForm}
              >
                <span>＋</span>
                Thêm thành viên
              </button>
            )}
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
                      <th>Trạng thái</th>
                      <th>Email</th>
                      <th>Ngày sinh</th>
                      <th>Điện thoại</th>
                      <th>Địa chỉ</th>
                      <th>Account ID</th>
                      {/* Ẩn hẳn cột thao tác nếu không có quyền Sửa lẫn Xóa */}
                      {hasRowActions && <th className="member-action-heading">Thao tác</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {members.filter((m) => m.is_delete !== 1 && m.isDelete !== 1 && !isMemberAdmin(m)).length === 0 ? (
                      <tr>
                        <td colSpan={hasRowActions ? 9 : 8}>
                          <div className="member-empty">
                            <div className="member-empty-icon">👥</div>
                            <strong>Không tìm thấy thành viên</strong>
                            <span>Hãy thử thay đổi bộ lọc hoặc thêm thành viên mới.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      members
                        .filter((m) => m.is_delete !== 1 && m.isDelete !== 1 && !isMemberAdmin(m))
                        .map((member) => (
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

                          <td>
                            {member.enabled === false ? (
                              <span className="member-status-badge member-status-locked" title="Tài khoản đang bị khóa">
                                🔒 Đã khóa
                              </span>
                            ) : (
                              <span className="member-status-badge member-status-active" title="Tài khoản đang hoạt động bình thường">
                                🟢 Hoạt động
                              </span>
                            )}
                          </td>

                          <td>{member.email || '—'}</td>

                          <td>{member.dateOfBirth || '—'}</td>

                          <td>{member.phone || '—'}</td>

                          <td className="member-address">{member.address || '—'}</td>

                          <td className="member-mono">
                            {member.accountId ? `#${member.accountId}` : '—'}
                          </td>

                          {/* Nút hành động theo quyền */}
                          {hasRowActions && (
                            <td>
                              <div className="member-row-actions">
                                {/* Khóa / Mở khóa tài khoản: Giúp bảo lưu lịch sử mượn trả mà vẫn chặn truy cập */}
                                {canUpdate && (
                                  <button
                                    type="button"
                                    className={`member-action-btn ${
                                      member.enabled === false
                                        ? 'member-action-unlock'
                                        : 'member-action-lock'
                                    }`}
                                    onClick={() => handleToggleLock(member)}
                                    title={
                                      member.enabled === false
                                        ? 'Mở khóa tài khoản độc giả'
                                        : 'Khóa tài khoản độc giả'
                                    }
                                  >
                                    {member.enabled === false ? '🔓 Mở khóa' : '🔒 Khóa'}
                                  </button>
                                )}

                                {/* MEMBER_UPDATE: Hiện nút Sửa */}
                                {canUpdate && (
                                  <button
                                    type="button"
                                    className="member-action-btn"
                                    onClick={() => openEditForm(member)}
                                  >
                                    Sửa
                                  </button>
                                )}

                                {/* MEMBER_DELETE: Chỉ ADMIN có quyền xóa, STAFF không có */}
                                {canDelete && (
                                  <button
                                    type="button"
                                    className="member-action-btn member-action-danger"
                                    onClick={() => handleDelete(member)}
                                  >
                                    Xóa
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
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
                disabled={page === 0 || loading}
                onClick={() => {
                  loadMembers(page - 1, searchFilters);
                }}
              >
                ‹
              </button>

              <span>{totalPages === 0 ? 0 : page + 1}</span>

              <button
                type="button"
                disabled={totalPages === 0 || page >= totalPages - 1 || loading}
                onClick={() => {
                  loadMembers(page + 1, searchFilters);
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
                <span>MEMBER PROFILE</span>
                <h2>{editingMember ? 'Cập nhật thông tin thành viên' : 'Thêm thành viên mới'}</h2>
              </div>

              <button type="button" onClick={() => setShowForm(false)}>
                ×
              </button>
            </div>

            <form className="member-form" onSubmit={handleSubmit} noValidate>
              {!editingMember && (
                <div className="member-field">
                  <label>Account ID *</label>

                  <input
                    type="number"
                    name="accountId"
                    className={formErrors.accountId ? 'input-error' : ''}
                    min="1"
                    placeholder="Nhập ID tài khoản đã tồn tại"
                    value={formData.accountId}
                    onChange={handleChange}
                  />
                  {formErrors.accountId && <span className="field-error">{formErrors.accountId}</span>}
                </div>
              )}

              <div className="member-field">
                <label>Họ và tên *</label>

                <input
                  type="text"
                  name="fullName"
                  className={formErrors.fullName ? 'input-error' : ''}
                  placeholder="Nhập họ và tên"
                  value={formData.fullName}
                  onChange={handleChange}
                />
                {formErrors.fullName && <span className="field-error">{formErrors.fullName}</span>}
              </div>

              <div className="member-form-grid">
                <div className="member-field">
                  <label>Ngày sinh *</label>

                  <input
                    type="date"
                    name="dateOfBirth"
                    className={formErrors.dateOfBirth ? 'input-error' : ''}
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                  />
                  {formErrors.dateOfBirth && <span className="field-error">{formErrors.dateOfBirth}</span>}
                </div>

                <div className="member-field">
                  <label>Số điện thoại *</label>

                  <input
                    type="text"
                    name="phone"
                    className={formErrors.phone ? 'input-error' : ''}
                    placeholder="Ví dụ: 0912345678"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                  {formErrors.phone && <span className="field-error">{formErrors.phone}</span>}
                </div>
              </div>

              <div className="member-field">
                <label>Địa chỉ *</label>

                <input
                  type="text"
                  name="address"
                  className={formErrors.address ? 'input-error' : ''}
                  placeholder="Nhập địa chỉ"
                  value={formData.address}
                  onChange={handleChange}
                />
                {formErrors.address && <span className="field-error">{formErrors.address}</span>}
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
    </div>
  );
}

export default MemberManagement;
