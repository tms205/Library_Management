import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import '../styles/modal.css';
export default function Modal({ children, onClose, busy = false, labelledBy, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = oldOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return createPortal(<dialog ref={ref} className={`library-dialog ${className}`} aria-labelledby={labelledBy} aria-busy={busy} onCancel={(e) => { e.preventDefault(); if (!busy) onClose(); }} onClick={(e) => {
    if (e.target !== e.currentTarget || busy) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) onClose();
  }}>{children}</dialog>, document.body);
}
