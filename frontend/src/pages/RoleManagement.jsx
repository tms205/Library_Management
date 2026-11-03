import { useState, useEffect, useCallback } from 'react';
import { getPermissionGroups, searchAccountsForRoles, updateAccountRole } from '../api/roleApi';
import { getUserInfo } from '../utils/auth';
import '../styles/roles.css';

// Trang Quản lý Phân quyền theo Nhóm (Chỉ dành riêng cho Admin)
export default function RoleManagement() {
  const currentUser = getUserInfo();

  // State danh sách nhóm quyền và tài khoản
  const [groups, setGroups] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // State thông báo
  const [alert, setAlert] = useState(null); // { type: 'success' | 'error', message: '' }

  // State Modal phân quyền
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Tải danh sách nhóm quyền hệ thống
  useEffect(() => {
    getPermissionGroups()
      .then((res) => {
        setGroups(res.data || []);
      })
      .catch((err) => {
        console.error('Lỗi khi tải danh sách nhóm quyền:', err);
      });
  }, []);

  // Tải danh sách tài khoản theo trang và từ khóa tìm kiếm
  const loadAccounts = useCallback(async (pageIndex = 0, keyword = search) => {
    try {
      setLoading(true);
      const res = await searchAccountsForRoles({
        search: keyword.trim() || undefined,
        page: pageIndex,
        size: 10,
      });

      const data = res.data;
      setAccounts(data.content || []);
      setTotalPages(data.totalPages || 0);
      setPage(pageIndex);
    } catch (err) {
      console.error('Lỗi khi tải danh sách tài khoản:', err);
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Không thể tải danh sách tài khoản!',
      });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadAccounts(0);
  }, [loadAccounts]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadAccounts(0, search);
  };

  const handleResetSearch = () => {
    setSearch('');
    loadAccounts(0, '');
  };

  // Mở modal đổi quyền cho tài khoản
  const handleOpenModal = (acc) => {
    setSelectedAccount(acc);
    setSelectedGroupId(acc.groupId || (groups[0]?.id ?? null));
    setModalOpen(true);
  };

  // Lưu nhóm quyền mới
  const handleSaveRole = async () => {
    if (!selectedAccount || !selectedGroupId) return;

    try {
      setSaving(true);
      await updateAccountRole(selectedAccount.accountId, selectedGroupId);

      const targetGroup = groups.find((g) => g.id === selectedGroupId);
      setAlert({
        type: 'success',
        message: `Đã cập nhật nhóm quyền cho tài khoản "${selectedAccount.email}" thành "${targetGroup?.name || 'Nhóm mới'}" thành công!`,
      });

      setModalOpen(false);
      loadAccounts(page); // Tải lại trang hiện tại
    } catch (err) {
      console.error('Lỗi khi cập nhật nhóm quyền:', err);
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Không thể cập nhật nhóm quyền cho tài khoản này!',
      });
    } finally {
      setSaving(false);
    }
  };

  // Badge hiển thị nhóm quyền đẹp mắt
  const renderGroupBadge = (groupName) => {
    switch (groupName) {
      case 'ADMIN_GROUP':
        return <span className="role-group-badge badge-admin">👑 Admin</span>;
      case 'STAFF_GROUP':
        return <span className="role-group-badge badge-staff">🧑‍💼 Thủ thư (Staff)</span>;
      case 'USER_GROUP':
        return <span className="role-group-badge badge-user">📖 Độc giả (User)</span>;
      default:
        return <span className="role-group-badge badge-other">{groupName || 'Chưa gán'}</span>;
    }
  };

  // Kiểm tra tài khoản có được phép sửa quyền hay không
  const isProtectedAccount = (acc) => {
    // Không cho sửa Admin root (ID 1 hoặc email admin)
    if (acc.accountId === 1 || acc.email?.toLowerCase() === 'admin') {
      return { protected: true, reason: 'Tài khoản Quản trị tối cao' };
    }
    // Không cho tự sửa tài khoản của chính mình (chống self-lockout)
    if (currentUser?.email && acc.email?.toLowerCase() === currentUser.email.toLowerCase()) {
      return { protected: true, reason: 'Tài khoản của bạn' };
    }
    return { protected: false };
  };

  return (
    <div className="role-page">
      <div className="role-page-wrapper">
        {/* Tiêu đề trang */}
        <div className="role-header">
          <div className="role-pretitle">BẢO MẬT & HỆ THỐNG</div>
          <h1 className="role-title">🛡️ Phân quyền tài khoản</h1>
          <p className="role-desc">
            Chỉ Quản trị viên (Admin) mới có thẩm quyền phân chia vai trò và gán nhóm quyền hạn cho người dùng trong thư viện.
          </p>
        </div>

        {/* Thông báo Alert */}
        {alert && (
          <div className={`role-alert ${alert.type === 'success' ? 'role-alert-success' : 'role-alert-error'}`}>
            <span>{alert.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{alert.message}</span>
            <button
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setAlert(null)}
            >
              ✕
            </button>
          </div>
        )}

        {/* Thẻ tổng quan các nhóm quyền */}
        <div className="role-groups-overview">
          <div className="role-group-card admin">
            <div className="role-group-header">
              <span className="role-group-title">👑 Nhóm Quản trị</span>
              <span className="role-group-badge badge-admin">ADMIN_GROUP</span>
            </div>
            <p className="role-group-desc">
              Toàn quyền hệ thống: Cấu hình bảo trì, phân quyền người dùng, quản lý sách, độc giả và duyệt mượn trả.
            </p>
          </div>

          <div className="role-group-card staff">
            <div className="role-group-header">
              <span className="role-group-title">🧑‍💼 Nhóm Thủ thư</span>
              <span className="role-group-badge badge-staff">STAFF_GROUP</span>
            </div>
            <p className="role-group-desc">
              Vận hành nghiệp vụ: Thêm/sửa sách, import CSV, duyệt yêu cầu mượn/trả sách và xem danh sách độc giả.
            </p>
          </div>

          <div className="role-group-card user">
            <div className="role-group-header">
              <span className="role-group-title">📖 Nhóm Độc giả</span>
              <span className="role-group-badge badge-user">USER_GROUP</span>
            </div>
            <p className="role-group-desc">
              Người dùng thông thường: Tra cứu tìm kiếm sách, gửi yêu cầu mượn sách và theo dõi lịch sử mượn trả của mình.
            </p>
          </div>
        </div>

        {/* Khung tìm kiếm và Bảng danh sách tài khoản */}
        <div className="role-card">
          <div className="role-search-bar">
            <form className="role-search-form" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                className="role-input"
                placeholder="Tìm kiếm theo email tài khoản..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="role-btn role-btn-primary">
                🔍 Tìm
              </button>
              {search && (
                <button type="button" className="role-btn role-btn-outline" onClick={handleResetSearch}>
                  Đặt lại
                </button>
              )}
            </form>

            <div className="role-page-info">
              Trang {totalPages === 0 ? 0 : page + 1} / {totalPages}
            </div>
          </div>

          <div className="role-table-wrapper">
            <table className="role-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tài khoản</th>
                  <th>Họ và tên</th>
                  <th>Trạng thái</th>
                  <th>Nhóm quyền hiện tại</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px' }}>
                      ⏳ Đang tải dữ liệu tài khoản...
                    </td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      Không tìm thấy tài khoản nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  accounts.map((acc) => {
                    const check = isProtectedAccount(acc);
                    return (
                      <tr key={acc.accountId}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>#{acc.accountId}</td>
                        <td>
                          <div className="role-cell-user">
                            <div className="role-avatar">
                              {acc.email ? acc.email.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="role-user-email">{acc.email}</div>
                              <div className="role-user-sub">
                                {acc.role === 'ADMIN' ? '👑 Quyền Admin' : '👤 Người dùng'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{acc.fullName}</span>
                        </td>
                        <td>
                          {acc.enabled ? (
                            <span style={{ color: '#15803d', fontWeight: 600, fontSize: '15px' }}>
                              🟢 Hoạt động
                            </span>
                          ) : (
                            <span style={{ color: '#b91c1c', fontWeight: 600, fontSize: '15px' }}>
                              🔒 Đã khóa
                            </span>
                          )}
                        </td>
                        <td>{renderGroupBadge(acc.groupName)}</td>
                        <td style={{ textAlign: 'right' }}>
                          {check.protected ? (
                            <span className="role-protected-tag" title={check.reason}>
                              🔒 {check.reason}
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="role-btn role-btn-outline role-btn-sm"
                              onClick={() => handleOpenModal(acc)}
                            >
                              ⚙️ Đổi nhóm quyền
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                className="role-btn role-btn-outline role-btn-sm"
                disabled={page <= 0}
                onClick={() => loadAccounts(page - 1)}
              >
                ◀ Trang trước
              </button>
              <button
                type="button"
                className="role-btn role-btn-outline role-btn-sm"
                disabled={page >= totalPages - 1}
                onClick={() => loadAccounts(page + 1)}
              >
                Trang sau ▶
              </button>
            </div>
          )}
        </div>

        {/* Modal Đổi nhóm quyền */}
        {modalOpen && selectedAccount && (
          <div className="role-modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="role-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="role-modal-header">
                <h3 className="role-modal-title">⚙️ Gán nhóm quyền tài khoản</h3>
                <button type="button" className="role-modal-close" onClick={() => setModalOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="role-modal-body">
                <div className="role-modal-target">
                  <div className="role-modal-target-email">{selectedAccount.email}</div>
                  <div className="role-modal-target-name">Độc giả: {selectedAccount.fullName}</div>
                </div>

                <div style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600, color: '#475569' }}>
                  CHỌN NHÓM VAI TRÒ MỚI:
                </div>

                <div className="role-options-list">
                  {groups.map((g) => {
                    const isSelected = selectedGroupId === g.id;
                    return (
                      <div
                        key={g.id}
                        className={`role-option-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedGroupId(g.id)}
                      >
                        <input
                          type="radio"
                          name="roleGroup"
                          className="role-option-radio"
                          checked={isSelected}
                          onChange={() => setSelectedGroupId(g.id)}
                        />
                        <div className="role-option-info">
                          <div className="role-option-name">
                            {renderGroupBadge(g.name)}
                            <span>{g.description || g.name}</span>
                          </div>
                          <div className="role-option-desc">
                            {g.name === 'ADMIN_GROUP' && 'Có đầy đủ mọi quyền: bảo trì, phân quyền, quản lý mượn trả và sách.'}
                            {g.name === 'STAFF_GROUP' && 'Thêm/sửa sách, import CSV, duyệt yêu cầu mượn/trả và xem độc giả.'}
                            {g.name === 'USER_GROUP' && 'Khám phá sách, yêu cầu mượn và trả sách của cá nhân.'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="role-modal-footer">
                <button
                  type="button"
                  className="role-btn role-btn-outline"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  className="role-btn role-btn-primary"
                  onClick={handleSaveRole}
                  disabled={saving}
                >
                  {saving ? '⏳ Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
