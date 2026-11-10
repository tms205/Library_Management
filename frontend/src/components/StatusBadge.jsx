const STATUS_CONFIG = {
  PENDING: {
    label: 'Chờ duyệt',
    className: 'badge-clean badge-warning',
    dotColor: '#d97706',
  },
  BORROWED: {
    label: 'Đang mượn',
    className: 'badge-clean badge-info',
    dotColor: '#0284c7',
  },
  RETURN_PENDING: {
    label: 'Chờ xác nhận trả',
    className: 'badge-clean badge-purple',
    dotColor: '#7c3aed',
  },
  RETURNED: {
    label: 'Đã hoàn trả',
    className: 'badge-clean badge-success',
    dotColor: '#059669',
  },
  REJECTED: {
    label: 'Bị từ chối',
    className: 'badge-clean badge-danger',
    dotColor: '#dc2626',
  },
  OVERDUE: {
    label: 'Quá hạn',
    className: 'badge-clean badge-danger',
    dotColor: '#dc2626',
  },
};

export default function StatusBadge({ status, customLabel }) {
  const config = STATUS_CONFIG[status] || {
    label: customLabel || status || '—',
    className: 'badge-clean badge-neutral',
    dotColor: '#64748b',
  };

  return (
    <span className={config.className}>
      <span className="badge-dot" style={{ backgroundColor: config.dotColor }} />
      <span>{customLabel || config.label}</span>
    </span>
  );
}
