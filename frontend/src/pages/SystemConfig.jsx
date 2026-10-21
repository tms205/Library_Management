import { useEffect, useState } from 'react';
import { getSystemConfig, updateMaintenanceMode } from '../api/systemConfigApi';

import '../styles/system-config.css';

function SystemConfig() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [savedMaintenanceMode, setSavedMaintenanceMode] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const response = await getSystemConfig();

        if (cancelled) {
          return;
        }

        const data = response.data;

        const currentMode =
          typeof data === 'boolean'
            ? data
            : Boolean(data?.maintenanceMode ?? data?.enabled ?? false);

        setMaintenanceMode(currentMode);
        setSavedMaintenanceMode(currentMode);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(error);
        setMessageType('error');
        setMessage(
          error.response?.data?.message ||
            error.response?.data?.error ||
            'Không thể tải cấu hình hệ thống!',
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasChanges = maintenanceMode !== savedMaintenanceMode;

  const handleToggle = () => {
    setMaintenanceMode((current) => !current);
    setMessage('');
  };

  const handleCancel = () => {
    setMaintenanceMode(savedMaintenanceMode);
    setMessage('');
  };

  const handleSave = async () => {
    if (!hasChanges) {
      setMessageType('success');
      setMessage('Cấu hình hiện tại chưa có thay đổi.');
      return;
    }

    if (maintenanceMode) {
      const confirmed = window.confirm(
        'Bạn có chắc muốn bật Maintenance Mode? Các chức năng của hệ thống sẽ tạm thời bị chặn đối với người dùng.',
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      setSaving(true);
      setMessage('');

      await updateMaintenanceMode(maintenanceMode);
      setSavedMaintenanceMode(maintenanceMode);

      setMessageType('success');
      setMessage(
        maintenanceMode
          ? 'Đã bật chế độ bảo trì hệ thống thành công.'
          : 'Đã tắt chế độ bảo trì. Hệ thống hoạt động bình thường.',
      );
    } catch (error) {
      console.error(error);
      setMessageType('error');
      setMessage(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Không thể cập nhật cấu hình hệ thống!',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="sys-page">
        <div className="sys-loading-card">
          <div className="sys-spinner" />
          <span>Đang tải cấu hình hệ thống...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sys-page">
      <div className="sys-page-wrapper">
        <header className="sys-page-header">
          <div>
            <div className="sys-page-pretitle">Library / System Settings</div>
            <h1>Cấu hình hệ thống</h1>
            <p>Quản lý trạng thái vận hành máy chủ và chế độ bảo trì toàn hệ thống.</p>
          </div>
        </header>

        {message && (
          <div
            className={`sys-alert ${
              messageType === 'error' ? 'sys-alert-error' : 'sys-alert-success'
            }`}
          >
            <span className="sys-alert-dot" />
            <span>{message}</span>

            <button type="button" onClick={() => setMessage('')} aria-label="Đóng thông báo">
              ×
            </button>
          </div>
        )}

        <section className="sys-card">
          <div className="sys-card-header">
            <div>
              <h2>Maintenance Mode</h2>
              <p>Bật chế độ này khi cần tạm dừng các chức năng của hệ thống để nâng cấp hoặc bảo trì.</p>
            </div>

            <div
              className={`sys-status-badge ${
                savedMaintenanceMode ? 'sys-status-maintenance' : 'sys-status-active'
              }`}
            >
              <span />
              {savedMaintenanceMode ? 'Đang bảo trì' : 'Đang hoạt động'}
            </div>
          </div>

          <div className="sys-card-body">
            <div className="sys-setting-row">
              <div className="sys-setting-info">
                <div className={`sys-setting-icon ${maintenanceMode ? 'maintenance' : 'active'}`}>
                  {maintenanceMode ? '!' : '✓'}
                </div>

                <div>
                  <h3>Chế độ bảo trì hệ thống</h3>
                  <p>
                    {maintenanceMode
                      ? 'Sau khi lưu, các API của hệ thống sẽ bị tạm chặn theo cấu hình bộ lọc bảo trì.'
                      : 'Hệ thống đang ở trạng thái trực tuyến sẵn sàng phục vụ toàn bộ bạn đọc.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className={`sys-switch ${maintenanceMode ? 'on' : ''}`}
                onClick={handleToggle}
                aria-pressed={maintenanceMode}
              >
                <span className="sys-switch-track">
                  <span className="sys-switch-thumb" />
                </span>
                <strong>{maintenanceMode ? 'BẬT' : 'TẮT'}</strong>
              </button>
            </div>

            <div className={`sys-state-panel ${maintenanceMode ? 'maintenance' : 'active'}`}>
              <div className="sys-state-heading">
                <span className="sys-state-dot" />
                <strong>
                  {maintenanceMode
                    ? 'Hệ thống sẽ chuyển sang trạng thái bảo trì'
                    : 'Hệ thống đang hoạt động bình thường'}
                </strong>
              </div>

              <p>
                {maintenanceMode
                  ? 'Người dùng thông thường sẽ bị chặn khi gọi các API nghiệp vụ. Tài khoản quản trị viên (Admin) vẫn có quyền truy cập cấu hình để tắt bảo trì.'
                  : 'Các chức năng đăng nhập, tra cứu sách, quản lý thành viên, mượn và trả sách hoạt động đầy đủ theo phân quyền.'}
              </p>
            </div>

            <div className="sys-note">
              <strong>Lưu ý:</strong>
              <span>Thay đổi trạng thái chỉ có hiệu lực sau khi bạn nhấn nút “Lưu cấu hình”.</span>
            </div>
          </div>

          <div className="sys-card-footer">
            <div className="sys-change-state">
              {hasChanges ? 'Có thay đổi chưa lưu' : 'Không có thay đổi'}
            </div>

            <div className="sys-actions">
              <button
                type="button"
                className="sys-btn sys-btn-outline"
                disabled={!hasChanges || saving}
                onClick={handleCancel}
              >
                Hủy thay đổi
              </button>

              <button
                type="button"
                className="sys-btn sys-btn-primary"
                disabled={!hasChanges || saving}
                onClick={handleSave}
              >
                {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SystemConfig;
