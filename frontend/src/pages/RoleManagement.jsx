import Modal from '../components/Modal';
import ErrorState from '../components/ErrorState';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getPermissionGroups,
  getAllPermissions,
  createPermissionGroup,
  updatePermissionGroup,
  deletePermissionGroup,
  searchAccountsForRoles,
  updateAccountRole,
} from '../api/roleApi';
import { getUserInfo } from '../utils/auth';
import { useToast } from '../context/ToastContext';
import { SkeletonTable } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Search,
  RotateCcw,
  Edit3,
  X,
  Crown,
  Briefcase,
  User,
  Lock,
  Users,
  Plus,
  Trash2,
  ShieldCheck,
  CheckSquare,
  Square,
  Shield,
  Layers,
} from 'lucide-react';
import '../styles/roles.css';

// Trang Quản lý Phân quyền theo Nhóm Động (Dynamic Permission Groups & RBAC)
export default function RoleManagement() {
  const currentUser = getUserInfo();
  const toast = useToast();

  const [groups, setGroups] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loadError, setLoadError] = useState('');
  const [groupError, setGroupError] = useState('');
  const [groupRevision, setGroupRevision] = useState(0);
  const requestVersion = useRef(0);
  const mounted = useRef(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal gán nhóm cho tài khoản
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Modal tạo / chỉnh sửa nhóm quyền động
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null); // null: tạo mới, object: sửa
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedPermIds, setSelectedPermIds] = useState(new Set());
  const [savingGroup, setSavingGroup] = useState(false);

  // Confirm delete group modal
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(false);

  // Tải danh sách nhóm quyền và danh sách toàn bộ Permissions
  useEffect(() => {
    let active = true;
    Promise.all([getPermissionGroups(), getAllPermissions()])
      .then(([groupsRes, permsRes]) => {
        if (active) {
          setGroups(groupsRes.data || []);
          setAllPermissions(permsRes.data || []);
          setGroupError('');
        }
      })
      .catch(() => {
        if (!active) return;
        setGroupError('Không thể tải danh mục phân quyền hệ thống.');
        toast.error('Không thể tải danh sách nhóm quyền hoặc quyền hạn!');
      });
    return () => {
      active = false;
    };
  }, [toast, groupRevision]);

  // Tải danh sách tài khoản
  const loadAccounts = useCallback(
    async (pageIndex = 0, keyword = '') => {
      const version = ++requestVersion.current;
      try {
        setLoading(true);
        setLoadError('');
        const res = await searchAccountsForRoles({
          search: keyword.trim() || undefined,
          page: pageIndex,
          size: 10,
        });

        if (!mounted.current || version !== requestVersion.current) return;
        const data = res.data;
        setAccounts(data.content || []);
        setTotalPages(data.totalPages || 0);
        setTotalElements(data.totalElements || (data.content || []).length);
        setPage(pageIndex);
      } catch (err) {
        if (!mounted.current || version !== requestVersion.current) return;
        setLoadError(err.response?.data?.message || 'Không thể tải danh sách tài khoản.');
        toast.error(err.response?.data?.message || 'Không thể tải danh sách tài khoản!');
      } finally {
        if (mounted.current && version === requestVersion.current) setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    let active = true;
    mounted.current = true;
    Promise.resolve().then(() => {
      if (active) loadAccounts(0);
    });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [loadAccounts]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setAppliedSearch(search);
    loadAccounts(0, search);
  };

  const handleResetSearch = () => {
    setSearch('');
    setAppliedSearch('');
    loadAccounts(0, '');
  };

  // Mở modal đổi nhóm quyền tài khoản
  const handleOpenAccountModal = (acc) => {
    setSelectedAccount(acc);
    setSelectedGroupId(acc.groupId || (groups[0]?.id ?? null));
    setModalOpen(true);
  };

  // Lưu đổi nhóm quyền tài khoản
  const handleSaveRole = async () => {
    if (saving || !selectedAccount || !selectedGroupId) return;

    try {
      setSaving(true);
      await updateAccountRole(selectedAccount.accountId, selectedGroupId);

      const targetGroup = groups.find((g) => g.id === selectedGroupId);
      toast.success(
        `Đã phân quyền tài khoản "${selectedAccount.email}" thành "${targetGroup?.name || 'Nhóm mới'}" thành công!`,
      );

      setModalOpen(false);
      setGroupRevision((v) => v + 1);
      loadAccounts(page, appliedSearch);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật nhóm quyền cho tài khoản này!');
    } finally {
      setSaving(false);
    }
  };

  // Mở modal tạo nhóm quyền mới
  const handleOpenCreateGroupModal = () => {
    setEditingGroup(null);
    setGroupName('');
    setGroupDescription('');
    setSelectedPermIds(new Set());
    setGroupModalOpen(true);
  };

  // Mở modal chỉnh sửa nhóm quyền
  const handleOpenEditGroupModal = (group) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description || '');

    // Map permission names sang permission IDs
    const currentPermIds = new Set();
    const groupPermNames = group.permissions || [];
    allPermissions.forEach((p) => {
      if (groupPermNames.includes(p.name)) {
        currentPermIds.add(p.id);
      }
    });
    setSelectedPermIds(currentPermIds);
    setGroupModalOpen(true);
  };

  // Toggle checkbox permission
  const handleTogglePermission = (permId) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  };

  // Lưu nhóm quyền (Tạo mới hoặc Cập nhật)
  const handleSaveGroup = async () => {
    const trimmed = groupName.trim();
    if (!trimmed) {
      toast.error('Tên nhóm quyền không được để trống!');
      return;
    }

    try {
      setSavingGroup(true);
      const payload = {
        name: trimmed,
        description: groupDescription.trim() || undefined,
        permissionIds: Array.from(selectedPermIds),
      };

      if (editingGroup) {
        await updatePermissionGroup(editingGroup.id, payload);
        toast.success(`Đã cập nhật nhóm quyền "${trimmed}" thành công!`, 'Cập nhật nhóm');
      } else {
        await createPermissionGroup(payload);
        toast.success(`Đã tạo nhóm quyền mới "${trimmed}" thành công!`, 'Tạo nhóm mới');
      }

      setGroupModalOpen(false);
      setGroupRevision((v) => v + 1);
      loadAccounts(page, appliedSearch);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể lưu nhóm quyền!');
    } finally {
      setSavingGroup(false);
    }
  };

  // Thực hiện xóa nhóm quyền tùy chỉnh
  const executeDeleteGroup = async () => {
    if (!deleteConfirmGroup || deletingGroup) return;

    try {
      setDeletingGroup(true);
      await deletePermissionGroup(deleteConfirmGroup.id);
      toast.success(`Đã xóa nhóm quyền "${deleteConfirmGroup.name}" thành công!`);
      setDeleteConfirmGroup(null);
      setGroupRevision((v) => v + 1);
      loadAccounts(page, appliedSearch);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa nhóm quyền này!');
    } finally {
      setDeletingGroup(false);
    }
  };

  const renderGroupBadge = (groupName) => {
    switch (groupName) {
      case 'ADMIN_GROUP':
        return (
          <span className="badge-clean badge-danger">
            <Crown size={12} /> Admin
          </span>
        );
      case 'STAFF_GROUP':
        return (
          <span className="badge-clean badge-info">
            <Briefcase size={12} /> Thủ thư (Staff)
          </span>
        );
      case 'USER_GROUP':
        return (
          <span className="badge-clean badge-success">
            <User size={12} /> Độc giả (User)
          </span>
        );
      default:
        return (
          <span className="badge-clean badge-purple" style={{ backgroundColor: 'rgba(168, 85, 247, 0.12)', color: '#9333ea', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
            <Layers size={12} /> {groupName || 'Tùy chỉnh'}
          </span>
        );
    }
  };

  const isProtectedAccount = (acc) => {
    if (acc.accountId === 1 || acc.email?.toLowerCase() === 'admin') {
      return { protected: true, reason: 'Tài khoản Quản trị tối cao' };
    }
    if (currentUser?.email && acc.email?.toLowerCase() === currentUser.email.toLowerCase()) {
      return { protected: true, reason: 'Tài khoản của bạn' };
    }
    return { protected: false };
  };

  // Phân loại danh sách permissions theo nhóm chức năng
  const categorizedPermissions = [
    {
      category: 'Sách & Kho sách',
      perms: allPermissions.filter((p) => p.name.startsWith('BOOK_')),
    },
    {
      category: 'Độc giả & Thành viên',
      perms: allPermissions.filter((p) => p.name.startsWith('MEMBER_')),
    },
    {
      category: 'Mượn & Trả sách',
      perms: allPermissions.filter((p) => p.name.startsWith('BORROW_') || p.name.startsWith('RETURN_')),
    },
    {
      category: 'Quản trị hệ thống',
      perms: allPermissions.filter((p) => p.name.startsWith('SYSTEM_')),
    },
  ];

  return (
    <div className="role-page">
      <div className="role-page-wrapper">
        <header className="bm-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="bm-page-pretitle">QUẢN TRỊ / PHÂN QUYỀN ĐỘNG</div>
            <h1>Phân quyền & Nhóm quyền</h1>
            <p>
              Quản lý các nhóm quyền tùy chỉnh (Dynamic RBAC), cấp quyền hạn theo chức năng và phân bổ vai trò cho tài khoản người dùng.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateGroupModal}
            style={{ height: '38px', gap: '8px' }}
          >
            <Plus size={16} /> Tạo nhóm quyền mới
          </button>
        </header>

        {/* Danh sách thẻ các nhóm quyền */}
        {groupError ? (
          <ErrorState message={groupError} onRetry={() => setGroupRevision((v) => v + 1)} />
        ) : (
          <div className="role-groups-overview" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {groups.map((group) => {
              const isDefault = Boolean(group.isDefault || ['ADMIN_GROUP', 'STAFF_GROUP', 'USER_GROUP'].includes(group.name));
              const accountCount = group.accountCount || 0;

              return (
                <article
                  className="role-group-card"
                  key={group.id}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div>
                    <div className="role-group-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {renderGroupBadge(group.name)}
                        {isDefault ? (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Mặc định</span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 600 }}>Tùy chỉnh</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="badge-clean badge-neutral" style={{ fontSize: '11.5px' }}>
                          <Users size={11} style={{ marginRight: '4px' }} /> {accountCount} user
                        </span>
                        <span className="badge-clean badge-neutral" style={{ fontSize: '11.5px' }}>
                          {group.permissions?.length || 0} quyền
                        </span>
                      </div>
                    </div>

                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {group.description || group.name}
                    </h3>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '14px' }}>
                      Mã nhóm: <code>{group.name}</code>
                    </div>

                    {/* Permissions tags list */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
                      {(group.permissions || []).slice(0, 5).map((p) => (
                        <span key={p} style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                          {p}
                        </span>
                      ))}
                      {(group.permissions || []).length > 5 && (
                        <span style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-muted)' }}>
                          +{group.permissions.length - 5} khác
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions for group */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                      onClick={() => handleOpenEditGroupModal(group)}
                    >
                      <Edit3 size={12} /> Sửa nhóm
                    </button>

                    {!isDefault && (
                      <button
                        type="button"
                        className="btn btn-outline btn-danger-outline"
                        style={{ height: '30px', padding: '0 10px', fontSize: '12px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        onClick={() => setDeleteConfirmGroup(group)}
                        title={accountCount > 0 ? 'Không thể xóa nhóm đang có tài khoản' : 'Xóa nhóm quyền này'}
                      >
                        <Trash2 size={12} /> Xóa
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Bảng danh sách tài khoản để phân quyền */}
        <div className="bm-card">
          <div className="bm-toolbar">
            <form className="bm-search-form" onSubmit={handleSearchSubmit} style={{ flexDirection: 'row', flex: 1, gap: '10px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Tìm kiếm tài khoản theo địa chỉ email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ height: '38px', fontSize: '13.5px' }}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ height: '38px' }}>
                <Search size={15} /> Tìm
              </button>
              {search && (
                <button type="button" className="btn btn-outline" onClick={handleResetSearch} style={{ height: '38px' }}>
                  <RotateCcw size={15} /> Đặt lại
                </button>
              )}
            </form>
          </div>

          {loading ? (
            <div style={{ padding: '16px 20px' }}>
              <SkeletonTable rows={5} columns={6} />
            </div>
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={() => loadAccounts(page, appliedSearch)} />
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Không tìm thấy tài khoản"
              description={
                search
                  ? `Không có tài khoản nào phù hợp với từ khóa "${search}".`
                  : 'Hiện tại chưa có tài khoản người dùng nào trong hệ thống.'
              }
              primaryAction={
                search
                  ? {
                      label: 'Xóa tìm kiếm',
                      onClick: handleResetSearch,
                    }
                  : undefined
              }
            />
          ) : (
            <div className="bm-table-wrapper">
              <table className="bm-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tài khoản</th>
                    <th>Họ và tên</th>
                    <th>Trạng thái</th>
                    <th>Nhóm quyền hiệu lực</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => {
                    const check = isProtectedAccount(acc);
                    return (
                      <tr key={acc.accountId}>
                        <td className="bm-mono">#{acc.accountId}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--primary-accent-soft)',
                                color: 'var(--primary-accent)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '13px',
                              }}
                            >
                              {acc.email ? acc.email.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{acc.email}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {acc.role === 'ADMIN' ? 'Quyền Admin' : 'Người dùng'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{acc.fullName}</span>
                        </td>
                        <td>
                          {acc.enabled ? (
                            <span className="badge-clean badge-success">
                              <span className="badge-dot" style={{ backgroundColor: '#059669' }} /> Hoạt động
                            </span>
                          ) : (
                            <span className="badge-clean badge-danger">
                              <Lock size={11} /> Đã khóa
                            </span>
                          )}
                        </td>
                        <td>{renderGroupBadge(acc.groupName)}</td>
                        <td style={{ textAlign: 'right' }}>
                          {check.protected ? (
                            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              {check.reason}
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                              onClick={() => handleOpenAccountModal(acc)}
                            >
                              <Edit3 size={12} /> Đổi nhóm quyền
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            pageSize={10}
            onPageChange={(newPage) => loadAccounts(newPage, appliedSearch)}
          />
        </div>

        {/* ========================================================
            MODAL 1: Gán nhóm quyền cho tài khoản
            ======================================================== */}
        {modalOpen && selectedAccount && (
          <Modal className="gt-modal" onClose={() => setModalOpen(false)} busy={saving} labelledBy="role-modal-title">
            <div className="gt-modal-header">
              <div>
                <span className="gt-modal-pretitle">NHÓM QUYỀN TÀI KHOẢN</span>
                <h2 id="role-modal-title">Phân bổ nhóm quyền</h2>
              </div>
              <button
                type="button"
                className="gt-modal-close"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '18px' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                  {selectedAccount.email}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Họ tên độc giả: {selectedAccount.fullName}
                </div>
              </div>

              <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                CHỌN NHÓM QUYỀN MỚI ÁP DỤNG:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {groups.map((g) => {
                  const isSelected = selectedGroupId === g.id;
                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGroupId(g.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1.5px solid ${isSelected ? 'var(--primary-accent)' : 'var(--border-light)'}`,
                        backgroundColor: isSelected ? 'var(--primary-accent-soft)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <input
                        type="radio"
                        name="roleGroup"
                        aria-label={g.description || g.name}
                        checked={isSelected}
                        onChange={() => setSelectedGroupId(g.id)}
                        style={{ marginTop: '3px', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          {renderGroupBadge(g.name)}
                          <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                            {g.description || g.name}
                          </strong>
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          {g.permissions && g.permissions.length > 0 ? (
                            <span>Quyền: {g.permissions.join(', ')}</span>
                          ) : (
                            <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Chưa có quyền hạn nào trong nhóm này</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="gt-modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveRole}
                disabled={saving || !selectedGroupId}
              >
                {saving ? (
                  <>
                    <span className="spinner" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  'Lưu thay đổi'
                )}
              </button>
            </div>
          </Modal>
        )}

        {/* ========================================================
            MODAL 2: Tạo mới hoặc Chỉnh sửa Nhóm quyền động (Dynamic RBAC)
            ======================================================== */}
        {groupModalOpen && (
          <Modal className="gt-modal" onClose={() => setGroupModalOpen(false)} busy={savingGroup} labelledBy="group-modal-title">
            <div className="gt-modal-header">
              <div>
                <span className="gt-modal-pretitle">{editingGroup ? 'CHỈNH SỬA' : 'TẠO MỚI'}</span>
                <h2 id="group-modal-title">
                  {editingGroup ? `Cấu hình nhóm "${editingGroup.name}"` : 'Tạo nhóm quyền mới'}
                </h2>
              </div>
              <button
                type="button"
                className="gt-modal-close"
                onClick={() => setGroupModalOpen(false)}
                disabled={savingGroup}
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Tên nhóm */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Tên định danh nhóm quyền <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: INVENTORY_STAFF hoặc Nhân viên kho sách"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  disabled={editingGroup && Boolean(editingGroup.isDefault)}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--border-light)',
                    backgroundColor: editingGroup && Boolean(editingGroup.isDefault) ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                  }}
                />
                {editingGroup && Boolean(editingGroup.isDefault) && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    * Không thể đổi tên nhóm mặc định của hệ thống.
                  </span>
                )}
              </div>

              {/* Mô tả nhóm */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Mô tả vai trò & trách nhiệm
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chuyên phụ trách kiểm đếm, nhập kho và bảo dưỡng sách"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--border-light)',
                    backgroundColor: 'var(--bg-surface)',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Danh sách Permissions dạng Checkbox phân theo nhóm */}
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  DANH MỤC QUYỀN HẠN ĐƯỢC PHÉP TRUY CẬP:
                </label>
                <span className="badge-clean badge-neutral" style={{ fontSize: '11.5px' }}>
                  Đã chọn: {selectedPermIds.size} quyền
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {categorizedPermissions.map((cat) => (
                  <div
                    key={cat.category}
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)', marginBottom: '10px' }}>
                      {cat.category}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
                      {cat.perms.map((perm) => {
                        const isChecked = selectedPermIds.has(perm.id);
                        return (
                          <div
                            key={perm.id}
                            onClick={() => handleTogglePermission(perm.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 10px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: isChecked ? 'var(--primary-accent-soft)' : 'var(--bg-surface)',
                              border: `1px solid ${isChecked ? 'var(--primary-accent)' : 'var(--border-light)'}`,
                              cursor: 'pointer',
                              userSelect: 'none',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(perm.id)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                                {perm.name}
                              </div>
                              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                {perm.description || perm.name}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="gt-modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setGroupModalOpen(false)}
                disabled={savingGroup}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveGroup}
                disabled={savingGroup || !groupName.trim()}
              >
                {savingGroup ? (
                  <>
                    <span className="spinner" />
                    <span>Đang lưu...</span>
                  </>
                ) : editingGroup ? (
                  'Cập nhật nhóm'
                ) : (
                  'Tạo nhóm mới'
                )}
              </button>
            </div>
          </Modal>
        )}

        {/* Modal xác nhận xóa nhóm quyền */}
        <ConfirmDialog
          isOpen={Boolean(deleteConfirmGroup)}
          variant="danger"
          title="Xác nhận xóa nhóm quyền"
          message={`Bạn có chắc chắn muốn xóa nhóm quyền "${deleteConfirmGroup?.name}" khỏi hệ thống? Thao tác này không thể hoàn tác.`}
          highlightText={
            deleteConfirmGroup?.accountCount > 0
              ? `CẢNH BÁO: Hiện có ${deleteConfirmGroup?.accountCount} tài khoản đang được gán nhóm này. Bạn phải chuyển họ sang nhóm khác trước!`
              : 'Nhóm quyền này hiện không có tài khoản nào sử dụng.'
          }
          confirmText="Xác nhận xóa nhóm"
          cancelText="Hủy bỏ"
          isLoading={deletingGroup}
          onConfirm={executeDeleteGroup}
          onCancel={() => setDeleteConfirmGroup(null)}
        />
      </div>
    </div>
  );
}
