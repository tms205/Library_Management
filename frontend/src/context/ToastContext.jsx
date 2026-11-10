import { createPortal } from 'react-dom';
import { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect, useSyncExternalStore } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import '../styles/toast.css';

const ToastContext = createContext(null);

function subscribeDialogChanges(callback) {
  const observer = new MutationObserver(callback);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
  return () => observer.disconnect();
}
function getToastHost() { return document.querySelector('dialog[open]') || document.body; }

export function ToastProvider({ children }) {
  const host = useSyncExternalStore(subscribeDialogChanges, getToastHost);
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);
  const timers = useRef(new Set());
  useEffect(() => { const pending = timers.current; return () => pending.forEach(clearTimeout); }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, message, title = '', duration = 3500) => {
    const id = ++idCounter.current;

    const newToast = {
      id,
      type,
      message,
      title,
      duration,
    };

    setToasts((prev) => [...prev.slice(-3), newToast]); // Giữ tối đa 4 toasts cùng lúc

    if (duration > 0) {
      const timer = setTimeout(() => { removeToast(id); timers.current.delete(timer); }, duration);
      timers.current.add(timer);
    }
  }, [removeToast]);

  const toast = useMemo(() => ({
    success: (msg, title = 'Thành công') => addToast('success', msg, title),
    error: (msg, title = 'Có lỗi xảy ra') => addToast('error', msg, title, 4500),
    warning: (msg, title = 'Cảnh báo') => addToast('warning', msg, title, 4000),
    info: (msg, title = 'Thông báo') => addToast('info', msg, title),
  }), [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(<div className="toast-container" role="region" aria-label="Thông báo hệ thống">
        {toasts.map((item) => {
          let Icon = Info;
          if (item.type === 'success') Icon = CheckCircle2;
          if (item.type === 'error') Icon = AlertCircle;
          if (item.type === 'warning') Icon = AlertTriangle;

          return (
            <div
              key={item.id}
              className={`toast-item toast-${item.type}`}
              role="status"
              aria-live="polite"
            >
              <Icon size={20} className="toast-icon" />
              <div className="toast-body">
                {item.title && <div className="toast-title">{item.title}</div>}
                <div className="toast-message">{item.message}</div>
              </div>
              <button
                type="button"
                className="toast-close-btn"
                onClick={() => removeToast(item.id)}
                aria-label="Đóng thông báo"
              >
                <X size={15} />
              </button>
              {item.duration > 0 && (
                <div className="toast-progress">
                  <div
                    className="toast-progress-bar"
                    style={{ animationDuration: `${item.duration}ms` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>, host)}
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook belongs with its provider
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
