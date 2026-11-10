import ErrorState from '../components/ErrorState';
import { useEffect, useState } from 'react';
import {
  Server,
  ShieldAlert,
  RotateCcw,
  Save,
  Activity,
  Info,
  Radio,
  Clock,
  Calendar,
} from 'lucide-react';
import { getSystemConfig, updateMaintenanceMode, updateBorrowDuration } from '../api/systemConfigApi';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { SkeletonText } from '../components/Skeleton';
import '../styles/system-config.css';

export default function SystemConfig() {
  const toast = useToast();

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [savedMaintenanceMode, setSavedMaintenanceMode] = useState(false);

  // Cấu hình thời hạn mượn sách động
  const [borrowDuration, setBorrowDuration] = useState(7);
  const [savedBorrowDuration, setSavedBorrowDuration] = useState(7);
  const [savingDuration, setSavingDuration] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const response = await getSystemConfig();

        if (cancelled) return;

        const data = response.data;
        const currentMode =
          typeof data === 'boolean'
            ? data
            : Boolean(data?.maintenanceMode ?? data?.enabled ?? false);

        const currentDuration = Number(data?.borrowDurationDays) || 7;

        setMaintenanceMode(currentMode);
        setSavedMaintenanceMode(currentMode);
        setBorrowDuration(currentDuration);
        setSavedBorrowDuration(currentDuration);
      } catch (error) {
        if (cancelled) return;
        setLoadError(error.response?.data?.message || 'Không thể đọc cấu hình hệ thống.');

        toast.error(
          error.response?.data?.message ||
            error.response?.data?.error ||
            'Không thể nạp tham số cấu hình hệ thống!',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    Promise.resolve().then(() => { if (!cancelled) loadConfig(); });

    return () => {
      cancelled = true;
    };
  }, [toast, revision]);

  const hasMaintenanceChanges = maintenanceMode !== savedMaintenanceMode;
  const hasDurationChanges = Number(borrowDuration) !== Number(savedBorrowDuration);

  const handleToggle = () => {
    setMaintenanceMode((current) => !current);
  };

  const handleCancelMaintenance = () => {
    setMaintenanceMode(savedMaintenanceMode);
    toast.info('Đã hoàn tác các thay đổi bảo trì.');
  };

  const handleSaveMaintenanceClick = () => {
    if (!hasMaintenanceChanges) {
      toast.info('Cấu hình bảo trì chưa có thay đổi nào cần lưu.');
      return;
    }

    if (maintenanceMode) {
      setShowConfirmModal(true);
    } else {
      executeSaveMaintenance();
    }
  };

  const executeSaveMaintenance = async () => {
    if (saving) return;
    try {
      setSaving(true);
      await updateMaintenanceMode(maintenanceMode);
      setSavedMaintenanceMode(maintenanceMode);
      setShowConfirmModal(false);

      if (maintenanceMode) {
        toast.warning(
          'Đã kích hoạt chế độ bảo trì hệ thống. Bạn đọc sẽ tạm thời bị chặn truy cập.',
          'Bảo trì đã bật',
        );
      } else {
        toast.success(
          'Đã tắt bảo trì. Toàn bộ dịch vụ thư viện đã trực tuyến bình thường.',
          'Hệ thống mở cửa',
        );
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Không thể cập nhật cấu hình bảo trì!',
      );
    } finally {
      setSaving(false);
    }
  };

  // Lưu cấu hình thời hạn mượn sách động
  const handleSaveDuration = async () => {
    const days = parseInt(borrowDuration, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      toast.error('Thời hạn mượn sách phải là số nguyên dương từ 1 đến 365 ngày!');
      return;
    }

    try {
      setSavingDuration(true);
      await updateBorrowDuration(days);
      setSavedBorrowDuration(days);
      toast.success(
        `Đã cập nhật thời hạn mượn sách thành công: ${days} ngày kể từ thời điểm duyệt phiếu!`,
        'Cấu hình mượn sách',
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Không thể lưu thời hạn mượn sách!',
      );
    } finally {
      setSavingDuration(false);
    }
  };

  const handleResetDuration = () => {
    setBorrowDuration(savedBorrowDuration);
  };

  if (loadError) return <ErrorState message={loadError} onRetry={() => { setLoadError(''); setLoading(true); setRevision((v) => v + 1); }} />;

  if (loading) {
    return (
      <div className="sys-page">
        <div className="sys-page-wrapper">
          <div className="sys-card" style={{ padding: '36px' }}>
            <SkeletonText width="240px" height="28px" style={{ marginBottom: '12px' }} />
            <SkeletonText width="400px" height="16px" style={{ marginBottom: '24px' }} />
            <SkeletonText width="100%" height="80px" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sys-page">
      <div className="sys-page-wrapper">
        <header className="sys-page-header">
          <div>
            <div className="sys-page-pretitle">Hệ thống &bull; Cấu hình vận hành</div>
            <h1>Cấu hình hệ thống</h1>
            <p>Quản lý tham số vận hành máy chủ, chính sách thời hạn mượn sách và bảo trì thư viện.</p>
          </div>

          <div className="sys-status-pill">
            <span
              className={`sys-heartbeat-dot ${
                savedMaintenanceMode ? 'dot-maintenance' : 'dot-online'
              }`}
            />
            <span>
              {savedMaintenanceMode ? 'Chế độ: Bảo trì' : 'Chế độ: Đang hoạt động'}
            </span>
          </div>
        </header>

        <div className="sys-grid">
          {/* Cột cấu hình chính: Chế độ bảo trì và Thời hạn mượn sách xếp dọc */}
          <div className="sys-main-column">
            {/* Main Configuration Card: Chế độ bảo trì */}
            <section className="sys-card sys-card-main">
            <div className="sys-card-header">
              <div className="sys-card-title-group">
                <div className="sys-icon-avatar">
                  <Server size={20} />
                </div>
                <div>
                  <h2>Chế độ bảo trì (Maintenance Mode)</h2>
                  <p>
                    Kiểm soát truy cập toàn hệ thống khi nâng cấp phần mềm hoặc bảo dưỡng cơ sở dữ liệu.
                  </p>
                </div>
              </div>

              <span
                className={`badge-clean ${
                  savedMaintenanceMode ? 'badge-danger' : 'badge-success'
                }`}
              >
                {savedMaintenanceMode ? 'Hệ thống đang khóa' : 'Hệ thống đang mở'}
              </span>
            </div>

            <div className="sys-card-body">
              <div className="sys-setting-row">
                <div className="sys-setting-info">
                  <div
                    className={`sys-setting-indicator ${
                      maintenanceMode ? 'is-maintenance' : 'is-active'
                    }`}
                  >
                    {maintenanceMode ? (
                      <ShieldAlert size={24} />
                    ) : (
                      <Radio size={24} />
                    )}
                  </div>

                  <div>
                    <h3>Khóa bảo trì toàn thư viện</h3>
                    <p>
                      {maintenanceMode
                        ? 'Đang chọn: BẬT bảo trì. Sau khi lưu, bạn đọc sẽ bị từ chối khi thực hiện mượn, trả hoặc tra cứu thông tin.'
                        : 'Đang chọn: TẮT bảo trì. Toàn bộ bạn đọc và nhân viên thủ thư truy cập và thao tác bình thường.'}
                    </p>
                  </div>
                </div>

                {/* Custom Accessible Switch */}
                <button
                  type="button"
                  className={`sys-switch-btn ${maintenanceMode ? 'is-checked' : ''}`}
                  disabled={saving} onClick={handleToggle}
                  aria-pressed={maintenanceMode}
                  title={maintenanceMode ? 'Nhấn để tắt bảo trì' : 'Nhấn để bật bảo trì'}
                >
                  <span className="sys-switch-track">
                    <span className="sys-switch-handle" />
                  </span>
                  <span className="sys-switch-label">
                    {maintenanceMode ? 'BẬT' : 'TẮT'}
                  </span>
                </button>
              </div>

              {/* Dynamic Status Preview Box */}
              <div
                className={`sys-preview-banner ${
                  maintenanceMode ? 'banner-maintenance' : 'banner-active'
                }`}
              >
                <div className="sys-preview-heading">
                  <Activity size={16} />
                  <strong>
                    {maintenanceMode
                      ? 'Dự kiến: Hệ thống sẽ chuyển sang trạng thái tạm khóa dịch vụ'
                      : 'Dự kiến: Chế độ bảo trì sẽ tắt'}
                  </strong>
                </div>
                <p>
                  {maintenanceMode
                    ? 'Bạn đọc truy cập ứng dụng sẽ nhận thông báo bảo trì. Chỉ tài khoản Quản trị viên (Admin) mới có quyền truy cập để gỡ bảo trì khi hoàn tất.'
                    : 'Hệ thống sẽ áp dụng quyền truy cập thông thường cho từng tài khoản.'}
                </p>
              </div>

              <div className="sys-info-callout">
                <Info size={16} className="sys-info-icon" />
                <span>
                  <strong>Quy tắc bảo vệ:</strong> Các thay đổi về chế độ bảo trì chỉ chính thức có hiệu lực trên máy chủ sau khi bạn nhấn nút <strong>“Lưu cấu hình”</strong> bên dưới.
                </span>
              </div>
            </div>

            <div className="sys-card-footer">
              <div className="sys-change-status">
                {hasMaintenanceChanges ? (
                  <span className="badge-clean badge-warning">Có thay đổi chưa lưu</span>
                ) : (
                  <span className="badge-clean badge-neutral">Chưa có thay đổi</span>
                )}
              </div>

              <div className="sys-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={!hasMaintenanceChanges || saving}
                  onClick={handleCancelMaintenance}
                >
                  <RotateCcw size={15} />
                  <span>Hủy thay đổi</span>
                </button>

                <button
                  type="button"
                  className={`btn ${maintenanceMode ? 'btn-danger' : 'btn-primary'}`}
                  disabled={!hasMaintenanceChanges || saving}
                  onClick={handleSaveMaintenanceClick}
                >
                  <Save size={15} />
                  <span>{saving ? 'Đang lưu cấu hình...' : 'Lưu cấu hình'}</span>
                </button>
              </div>
            </div>
          </section>

          {/* Configuration Card: Cấu hình thời hạn mượn sách động */}
          <section className="sys-card sys-card-main">
            <div className="sys-card-header">
              <div className="sys-card-title-group">
                <div className="sys-icon-avatar" style={{ backgroundColor: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary-accent)' }}>
                  <Calendar size={20} />
                </div>
                <div>
                  <h2>Chính sách thời hạn mượn sách (Borrow Duration)</h2>
                  <p>
                    Thiết lập số ngày được phép giữ sách sau khi Thủ thư duyệt phiếu mượn. Áp dụng ngay mà không cần khởi động lại máy chủ.
                  </p>
                </div>
              </div>

              <span className="badge-clean badge-info">
                <Clock size={12} /> Đang áp dụng: {savedBorrowDuration} ngày
              </span>
            </div>

            <div className="sys-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <label htmlFor="borrow-duration-input" style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                    Thời hạn mượn sách chuẩn:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      id="borrow-duration-input"
                      type="number"
                      min={1}
                      max={365}
                      value={borrowDuration}
                      onChange={(e) => setBorrowDuration(e.target.value)}
                      style={{
                        width: '100px',
                        height: '40px',
                        fontSize: '15px',
                        fontWeight: 700,
                        textAlign: 'center',
                        borderRadius: 'var(--radius-sm)',
                        border: '1.5px solid var(--border-light)',
                        backgroundColor: 'var(--bg-surface)'
                      }}
                    />
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>ngày</span>
                  </div>

                  {/* Preset quick buttons */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[7, 14, 21, 30].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`btn ${Number(borrowDuration) === preset ? 'btn-primary' : 'btn-outline'}`}
                        style={{ height: '32px', padding: '0 10px', fontSize: '12px' }}
                        onClick={() => setBorrowDuration(preset)}
                      >
                        {preset} ngày
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sys-info-callout" style={{ backgroundColor: 'var(--primary-accent-soft)', borderColor: 'rgba(99, 102, 241, 0.2)' }}>
                  <Info size={16} className="sys-info-icon" style={{ color: 'var(--primary-accent)' }} />
                  <span>
                    <strong>Hiệu lực chính sách:</strong> Khi Thủ thư duyệt yêu cầu mượn mới, hạn trả (Due Date) sẽ tự động được tính bằng <code>Ngày duyệt + {borrowDuration} ngày</code>. Các phiếu đã duyệt trước đó sẽ giữ nguyên hạn trả ban đầu.
                  </span>
                </div>
              </div>
            </div>

            <div className="sys-card-footer">
              <div className="sys-change-status">
                {hasDurationChanges ? (
                  <span className="badge-clean badge-warning">Thời hạn chưa lưu ({borrowDuration} ngày)</span>
                ) : (
                  <span className="badge-clean badge-neutral">Đã đồng bộ</span>
                )}
              </div>

              <div className="sys-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={!hasDurationChanges || savingDuration}
                  onClick={handleResetDuration}
                >
                  <RotateCcw size={15} />
                  <span>Hoàn tác</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!hasDurationChanges || savingDuration}
                  onClick={handleSaveDuration}
                >
                  <Save size={15} />
                  <span>{savingDuration ? 'Đang lưu...' : 'Lưu thời hạn mượn'}</span>
                </button>
              </div>
            </div>
          </section>
          </div>

          {/* Quick Technical Specs Aside */}
          <aside className="sys-aside-panel">
            <div className="sys-card sys-info-card">
              <div className="sys-info-header">
                <Activity size={18} />
                <h3>Hướng dẫn vận hành</h3>
              </div>
              <div className="sys-spec-list">
                <p><strong>Chế độ bảo trì:</strong> Tạm dừng truy cập nghiệp vụ của người dùng trong thời gian thư viện cần nâng cấp hệ thống.</p>
                <p><strong>Thời hạn mượn sách:</strong> Cấu hình trực tiếp số ngày mượn cho toàn hệ thống. Mặc định là 7 ngày.</p>
                <p><strong>Nguyên tắc bất biến:</strong> Các phiếu mượn cũ đã duyệt không bị thay đổi thời hạn hồi tố khi cập nhật chính sách mới.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Accessible Destructive Confirmation Modal */}
      <ConfirmDialog
        isOpen={showConfirmModal}
        variant="warning"
        title="Xác nhận kích hoạt Chế độ Bảo trì"
        message="Khi kích hoạt, toàn bộ yêu cầu gọi API nghiệp vụ (mượn, trả, tra cứu sách) từ độc giả sẽ tạm thời bị khóa cho đến khi bạn gỡ bảo trì."
        highlightText="Chỉ tài khoản Quản trị viên (Admin) mới có quyền truy cập bảng điều khiển này."
        confirmText="Bật bảo trì ngay"
        cancelText="Hủy thao tác"
        isLoading={saving}
        onConfirm={executeSaveMaintenance}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}
