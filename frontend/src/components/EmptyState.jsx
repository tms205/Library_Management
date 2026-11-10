import { Inbox, RotateCcw } from 'lucide-react';
import '../styles/emptyState.css';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Không tìm thấy dữ liệu',
  description = 'Hiện tại chưa có bản ghi nào phù hợp với điều kiện tìm kiếm hoặc dữ liệu đang trống.',
  primaryAction,
  actionLabel = primaryAction?.label,
  onAction = primaryAction?.onClick,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) {
  return (
    <div className={`empty-state-root ${className}`}>
      <div className="empty-state-icon-disc">
        <Icon size={26} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="empty-state-actions">
          {actionLabel && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onAction}
            >
              {actionLabel}
            </button>
          )}

          {secondaryActionLabel && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onSecondaryAction}
            >
              <RotateCcw size={14} />
              <span>{secondaryActionLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
