import { useId } from 'react';
import { AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import Modal from './Modal';
export default function ConfirmDialog({ isOpen, title = 'Xác nhận thao tác', message, highlightText, confirmText = 'Xác nhận', cancelText = 'Hủy bỏ', variant = 'danger', isLoading = false, onConfirm, onCancel }) {
  const titleId = useId();
  if (!isOpen) return null;
  const Icon = variant === 'info' ? HelpCircle : variant === 'warning' ? AlertCircle : AlertTriangle;
  return <Modal onClose={onCancel} busy={isLoading} labelledBy={titleId} className="confirm-dialog-card"><div className="confirm-dialog-header"><div className={`confirm-dialog-icon ${variant}`}><Icon size={24} /></div><h2 id={titleId}>{title}</h2></div><div className="confirm-dialog-body"><p>{message}</p>{highlightText && <div className="confirm-dialog-highlight">{highlightText}</div>}</div><div className="confirm-dialog-footer"><button autoFocus type="button" className="btn btn-outline" onClick={onCancel} disabled={isLoading}>{cancelText}</button><button type="button" className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={isLoading}>{isLoading && <span className="spinner" />}{isLoading ? 'Đang xử lý…' : confirmText}</button></div></Modal>;
}
