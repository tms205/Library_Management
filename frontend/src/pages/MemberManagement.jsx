import Modal from '../components/Modal';
import ErrorState from '../components/ErrorState';
import { useEffect, useState, useCallback, useRef } from 'react';
import { searchMembers, createMember, updateMember, deleteMember, toggleMemberStatus } from '../api/memberApi';
import { hasPermission } from '../utils/auth';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { SkeletonTable } from '../components/Skeleton';
import {
  UserPlus,
  Search,
  RotateCcw,
  Lock,
  Unlock,
  X,
  AlertCircle,
} from 'lucide-react';

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
  const canCreate = hasPermission('MEMBER_CREATE');
  const canUpdate = hasPermission('MEMBER_UPDATE');
  const canDelete = hasPermission('MEMBER_DELETE');
  const hasRowActions = canUpdate || canDelete;
  const toast = useToast();

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
  const [totalElements, setTotalElements] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const requestVersion = useRef(0);
  const mounted = useRef(false);

  // Modals xác nhận
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [memberToLockToggle, setMemberToLockToggle] = useState(null);
  const [isLockToggling, setIsLockToggling] = useState(false);

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

  const loadMembers = useCallback(async (targetPage = 0, filters = {}) => {
    const version = ++requestVersion.current;
    try {
      setLoading(true);
      setLoadError('');
      const response = await searchMembers({
        fullName: filters.fullName?.trim() || undefined,
        phone: filters.phone?.trim() || undefined,
        address: filters.address?.trim() || undefined,
        page: targetPage,
        size: 10,
        sortBy: 'fullName',
        direction: 'asc',
      });

      if (!mounted.current || version !== requestVersion.current) return;
      const data = response.data;
      let list = [];
      if (Array.isArray(data?.content)) {
        list = data.content;
        setTotalPages(data.totalPages ?? 0);
        setTotalElements(data.totalElements ?? data.content.length);
      } else if (Array.isArray(data)) {
        list = data;
        setTotalPages(data.length > 0 ? 1 : 0);
        setTotalElements(data.length);
      } else {
        setTotalPages(0);
        setTotalElements(0);
      }

      const visible = list.filter(
        (m) => m.is_delete !== 1 && m.isDelete !== 1 && !isMemberAdmin(m)
      );
      setMembers(visible);
      setPage(targetPage);
    } catch (error) {

      if (!mounted.current || version !== requestVersion.current) return;
      setLoadError(error.response?.data?.message || 'Không thể tải danh sách độc giả.');
      setMembers([]);
      setTotalPages(0);
      setTotalElements(0);
      toast.error(error.response?.data?.message || 'Không thể tải danh sách thành viên!');
    } finally {
      if (mounted.current && version === requestVersion.current) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    Promise.resolve().then(() => { if (active) loadMembers(0); });
    return () => { active = false; mounted.current = false; };
  }, [loadMembers]);

  const handleSearch = (event) => {
    event?.preventDefault();
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
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateModalForm = () => {
    const err = {};
    const phoneRegex = /^[0-9]{10,11}$/;

    if (!editingMember) {
      if (!formData.accountId || !Number.isInteger(Number(formData.accountId)) || Number(formData.accountId) <= 0) {
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
      err.phone = 'Số điện thoại phải gồm 10 hoặc 11 chữ số!';
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
    if (saving || !validateModalForm()) return;

    try {
      setSaving(true);
      if (editingMember) {
        await updateMember(editingMember.id, {
          fullName: formData.fullName.trim(),
          dateOfBirth: formData.dateOfBirth,
          phone: formData.phone.trim(),
          address: formData.address.trim(),
        });
        toast.success('Cập nhật thông tin độc giả thành công.');
      } else {
        await createMember({
          accountId: Number(formData.accountId),
          fullName: formData.fullName.trim(),
          dateOfBirth: formData.dateOfBirth,
          phone: formData.phone.trim(),
          address: formData.address.trim(),
        });
        toast.success('Thao tác lưu thông tin độc giả thành công.');
      }

      setShowForm(false);
      await reloadCurrentPage();
    } catch (error) {

      const data = error.response?.data;

      if (typeof data === 'string') {
        toast.error(data);
      } else if (data?.message) {
        toast.error(data.message);
      } else if (data?.error) {
        toast.error(data.error);
      } else if (data && typeof data === 'object') {
        const fieldErrors = Object.entries(data)
          .filter(([key]) => !['timestamp', 'status', 'error', 'path'].includes(key))
          .map(([, value]) => value);

        toast.error(fieldErrors[0] || 'Dữ liệu thành viên không hợp lệ!');
      } else {
        toast.error('Có lỗi xảy ra khi lưu thành viên!');
      }
    } finally { setSaving(false); }
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete || isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteMember(memberToDelete.id);
      toast.success(`Đã xóa hồ sơ độc giả "${memberToDelete.fullName}".`);
      setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
      setMemberToDelete(null);
      await reloadCurrentPage();
    } catch (error) {

      toast.error(error.response?.data?.message || 'Không thể xóa thành viên!');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmToggleLockMember = async () => {
    if (!memberToLockToggle || isLockToggling) return;
    const isCurrentlyActive = memberToLockToggle.enabled !== false;
    const actionText = isCurrentlyActive ? 'khóa' : 'mở khóa';

    try {
      setIsLockToggling(true);
      await toggleMemberStatus(memberToLockToggle.id, !isCurrentlyActive);
      toast.success(`Đã ${actionText} tài khoản độc giả "${memberToLockToggle.fullName}" thành công.`);
      setMemberToLockToggle(null);
      await reloadCurrentPage();
    } catch (error) {

      toast.error(error.response?.data?.message || `Không thể ${actionText} tài khoản thành viên!`);
    } finally {
      setIsLockToggling(false);
    }
  };

  const visibleMembers = members.filter(
    (m) => m.is_delete !== 1 && m.isDelete !== 1 && !isMemberAdmin(m)
  );

  return (
    <div className="member-page">
      <div className="member-page-wrapper">
        <header className="member-page-header">
          <div>
            <div className="member-page-pretitle">THƯ VIỆN / ĐỘC GIẢ</div>
            <h1>Quản lý độc giả</h1>
            <p>Quản lý danh bạ hồ sơ độc giả và kiểm soát truy cập tài khoản thành viên thư viện.</p>
          </div>

          <div className="member-page-actions">
            {canCreate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={openCreateForm}
              >
                <UserPlus size={16} />
                <span>Thêm độc giả mới</span>
              </button>
            )}
          </div>
        </header>

        {/* BỘ LỌC TÌM KIẾM */}
        <section className="member-card">
          <div className="member-card-header">
            <div>
              <h2>Bộ lọc tìm kiếm độc giả</h2>
              <p>Tìm kiếm nhanh theo họ tên, số điện thoại hoặc địa chỉ thường trú</p>
            </div>
          </div>

          <div className="member-card-body">
            <form className="member-filter-form" onSubmit={handleSearch}>
              <div className="member-field">
                <label htmlFor="filter-member-name">Họ và tên</label>
                <input
                  id="filter-member-name"
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A..."
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </div>

              <div className="member-field">
                <label htmlFor="filter-member-phone">Số điện thoại</label>
                <input
                  id="filter-member-phone"
                  type="text"
                  placeholder="Ví dụ: 0912345678..."
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>

              <div className="member-field">
                <label htmlFor="filter-member-address">Địa chỉ</label>
                <input
                  id="filter-member-address"
                  type="text"
                  placeholder="Nhập địa chỉ..."
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
              </div>

              <div className="member-filter-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleResetSearch}
                >
                  <RotateCcw size={15} /> Đặt lại
                </button>

                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Search size={15} /> Tìm kiếm
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* DANH SÁCH THÀNH VIÊN */}
        <section className="member-card">
          <div className="member-card-header">
            <div>
              <h2>Danh bạ độc giả</h2>
              <p>Danh sách các tài khoản độc giả đã đăng ký trong hệ thống thư viện</p>
            </div>

            <div className="member-page-count">
              Trang {totalPages === 0 ? 0 : page + 1} / {totalPages}
            </div>
          </div>

          <div className="member-table-container">
            {loading ? (
              <SkeletonTable rows={8} cols={hasRowActions ? 9 : 8} />
            ) : loadError ? (<ErrorState message={loadError} onRetry={() => loadMembers(page, searchFilters)} />) : visibleMembers.length === 0 ? (
              <EmptyState
                title="Không tìm thấy độc giả nào"
                description="Không có tài khoản độc giả nào khớp với tiêu chí tìm kiếm. Hãy thử đặt lại bộ lọc hoặc tạo hồ sơ độc giả mới."
                actionLabel={canCreate ? 'Thêm độc giả mới' : undefined}
                onAction={canCreate ? openCreateForm : undefined}
                secondaryActionLabel="Đặt lại bộ lọc"
                onSecondaryAction={handleResetSearch}
              />
            ) : (
              <div className="member-table-wrapper">
                <table className="member-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Độc giả</th>
                      <th>Trạng thái</th>
                      <th>Email</th>
                      <th>Ngày sinh</th>
                      <th>Điện thoại</th>
                      <th>Địa chỉ</th>
                      <th>Account ID</th>
                      {hasRowActions && <th className="member-action-heading">Thao tác</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {visibleMembers.map((member) => (
                      <tr key={member.id}>
                          <td className="member-mono">#{member.id}</td>

                          <td>
                            <div className="member-person">
                              <div className="member-avatar">
                                {member.fullName?.trim().charAt(0).toUpperCase() || 'M'}
                              </div>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {member.fullName}
                              </span>
                            </div>
                          </td>

                          <td>
                            {member.enabled === false ? (
                              <span className="badge-clean badge-danger" title="Tài khoản đang bị khóa">
                                <Lock size={12} /> Đã khóa
                              </span>
                            ) : (
                              <span className="badge-clean badge-success" title="Tài khoản đang hoạt động bình thường">
                                <span className="badge-dot" style={{ backgroundColor: '#059669' }} /> Hoạt động
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

                          {hasRowActions && (
                            <td>
                              <div className="member-row-actions">
                                {canUpdate && (
                                  <button
                                    type="button"
                                    className={`btn ${member.enabled === false ? 'btn-success' : 'btn-outline'}`}
                                    style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                                    onClick={() => setMemberToLockToggle(member)}
                                    title={
                                      member.enabled === false
                                        ? 'Mở khóa tài khoản độc giả'
                                        : 'Khóa tài khoản độc giả'
                                    }
                                  >
                                    {member.enabled === false ? (
                                      <>
                                        <Unlock size={12} /> Mở khóa
                                      </>
                                    ) : (
                                      <>
                                        <Lock size={12} /> Khóa
                                      </>
                                    )}
                                  </button>
                                )}

                                {canUpdate && (
                                  <button
                                    type="button"
                                    className="btn btn-outline"
                                    style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                                    onClick={() => openEditForm(member)}
                                  >
                                    Sửa
                                  </button>
                                )}

                                {canDelete && (
                                  <button
                                    type="button"
                                    className="btn btn-danger"
                                    style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                                    onClick={() => setMemberToDelete(member)}
                                  >
                                    Xóa
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="member-card-footer">
            <Pagination
              page={page}
              totalPages={totalPages}
              totalElements={totalElements}
              pageSize={10}
              onPageChange={(newPage) => loadMembers(newPage, searchFilters)}
            />
          </div>
        </section>
      </div>

      {/* MODAL THÊM / SỬA THÀNH VIÊN */}
      {showForm && (
        <Modal className="member-modal" onClose={() => setShowForm(false)} busy={saving} labelledBy="member-modal-title">
            <div className="member-modal-header">
              <div>
                <span className="gt-modal-pretitle">HỒ SƠ ĐỘC GIẢ</span>
                <h2 id="member-modal-title">{editingMember ? 'Cập nhật thông tin độc giả' : 'Thêm hồ sơ độc giả mới'}</h2>
              </div>

              <button
                type="button"
                className="gt-modal-close"
                disabled={saving} onClick={() => setShowForm(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <form className="member-form" onSubmit={handleSubmit} noValidate>
              {!editingMember && (
                <div className="member-field">
                  <label htmlFor="mem-account-id">Account ID *</label>
                  <input
                    id="mem-account-id"
                    type="number"
                    name="accountId"
                    className={formErrors.accountId ? 'input-error' : ''}
                    min="1"
                    placeholder="Nhập ID tài khoản đã tồn tại..."
                    value={formData.accountId}
                    onChange={handleChange}
                  />
                  {formErrors.accountId && <span className="field-error"><AlertCircle size={13} />{formErrors.accountId}</span>}
                </div>
              )}

              <div className="member-field">
                <label htmlFor="mem-fullname">Họ và tên *</label>
                <input
                  id="mem-fullname"
                  type="text"
                  name="fullName"
                  className={formErrors.fullName ? 'input-error' : ''}
                  placeholder="Nhập họ và tên độc giả..."
                  value={formData.fullName}
                  onChange={handleChange}
                />
                {formErrors.fullName && <span className="field-error"><AlertCircle size={13} />{formErrors.fullName}</span>}
              </div>

              <div className="member-form-grid">
                <div className="member-field">
                  <label htmlFor="mem-dob">Ngày sinh *</label>
                  <input
                    id="mem-dob"
                    type="date"
                    name="dateOfBirth"
                    className={formErrors.dateOfBirth ? 'input-error' : ''}
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                  />
                  {formErrors.dateOfBirth && <span className="field-error"><AlertCircle size={13} />{formErrors.dateOfBirth}</span>}
                </div>

                <div className="member-field">
                  <label htmlFor="mem-phone">Số điện thoại *</label>
                  <input
                    id="mem-phone"
                    type="text"
                    name="phone"
                    className={formErrors.phone ? 'input-error' : ''}
                    placeholder="Ví dụ: 0912345678"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                  {formErrors.phone && <span className="field-error"><AlertCircle size={13} />{formErrors.phone}</span>}
                </div>
              </div>

              <div className="member-field">
                <label htmlFor="mem-address">Địa chỉ thường trú *</label>
                <input
                  id="mem-address"
                  type="text"
                  name="address"
                  className={formErrors.address ? 'input-error' : ''}
                  placeholder="Nhập địa chỉ thường trú..."
                  value={formData.address}
                  onChange={handleChange}
                />
                {formErrors.address && <span className="field-error"><AlertCircle size={13} />{formErrors.address}</span>}
              </div>

              <div className="member-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={saving} onClick={() => setShowForm(false)}
                >
                  Hủy
                </button>

                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu…' : editingMember ? 'Lưu thay đổi' : 'Tạo hồ sơ độc giả'}
                </button>
              </div>
            </form>
        </Modal>
      )}

      {/* Accessible Destructive Delete Member Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(memberToDelete)}
        variant="danger"
        title="Xác nhận xóa hồ sơ độc giả"
        message="Hồ sơ độc giả này sẽ bị loại khỏi danh sách hoạt động. Nếu độc giả vẫn còn sách đang mượn, bạn nên thu hồi sách trước khi xóa."
        highlightText={memberToDelete ? `${memberToDelete.fullName} (Email: ${memberToDelete.email || 'N/A'})` : ''}
        confirmText="Xóa hồ sơ"
        cancelText="Hủy bỏ"
        isLoading={isDeleting}
        onConfirm={confirmDeleteMember}
        onCancel={() => setMemberToDelete(null)}
      />

      {/* Accessible Warning Lock/Unlock Member Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(memberToLockToggle)}
        variant={memberToLockToggle?.enabled === false ? 'info' : 'warning'}
        title={
          memberToLockToggle?.enabled === false
            ? 'Mở khóa tài khoản độc giả'
            : 'Khóa tài khoản độc giả'
        }
        message={
          memberToLockToggle?.enabled === false
            ? 'Độc giả sẽ được khôi phục quyền đăng nhập, mượn sách và tiếp tục sử dụng toàn bộ dịch vụ thư viện.'
            : 'Độc giả này sẽ tạm thời bị chặn đăng nhập và không thể đăng ký mượn sách mới. Toàn bộ lịch sử mượn trả cũ vẫn được bảo lưu nguyên vẹn.'
        }
        highlightText={memberToLockToggle ? `${memberToLockToggle.fullName} (Tài khoản ID: #${memberToLockToggle.accountId || memberToLockToggle.id})` : ''}
        confirmText={memberToLockToggle?.enabled === false ? 'Mở khóa ngay' : 'Khóa tài khoản'}
        cancelText="Hủy bỏ"
        isLoading={isLockToggling}
        onConfirm={confirmToggleLockMember}
        onCancel={() => setMemberToLockToggle(null)}
      />
    </div>
  );
}

export default MemberManagement;
