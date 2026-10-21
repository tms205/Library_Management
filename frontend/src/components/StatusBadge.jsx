export const STATUS_CONFIG = {
  PENDING: {
    label: 'Chờ duyệt',
    className: 'lib-badge lib-badge-pending',
    dotColor: '#d97706',
  },
  BORROWED: {
    label: 'Đang mượn',
    className: 'lib-badge lib-badge-borrowed',
    dotColor: '#4f46e5',
  },
  RETURN_PENDING: {
    label: 'Chờ xác nhận trả',
    className: 'lib-badge lib-badge-return-pending',
    dotColor: '#ea580c',
  },
  RETURNED: {
    label: 'Đã trả',
    className: 'lib-badge lib-badge-returned',
    dotColor: '#16a34a',
  },
  REJECTED: {
    label: 'Bị từ chối',
    className: 'lib-badge lib-badge-rejected',
    dotColor: '#dc2626',
  },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    label: status || '—',
    className: 'lib-badge lib-badge-default',
    dotColor: '#64748b',
  };

  return (
    <span className={config.className}>
      <span className="lib-badge-dot" style={{ backgroundColor: config.dotColor }} />
      <span>{config.label}</span>
    </span>
  );
}
