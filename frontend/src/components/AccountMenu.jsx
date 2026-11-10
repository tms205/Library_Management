import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, KeyRound, Mail, LogOut } from 'lucide-react';
import { getUserInfo, logout } from '../utils/auth';
export default function AccountMenu() {
  const user = getUserInfo();
  const ref = useRef(null);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    function closeOutside(event) { if (ref.current?.open && !ref.current.contains(event.target)) ref.current.open = false; }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);
  const close = () => { ref.current.open = false; };
  return <details className="account-dropdown" ref={ref} onKeyDown={(e) => { if (e.key === 'Escape' && ref.current.open) { close(); ref.current.querySelector('summary').focus(); } }}><summary aria-label="Menu tài khoản"><span className="avatar avatar-small">{user.username.charAt(0).toUpperCase()}</span><ChevronDown size={14} /></summary><div className="account-menu"><strong>{user.username}</strong><small>{user.email}</small><Link to="/change-password" onClick={close}><KeyRound size={16} />Đổi mật khẩu</Link><Link to="/change-email" onClick={close}><Mail size={16} />Đổi email</Link><button type="button" disabled={leaving} onClick={() => { setLeaving(true); logout(); }}><LogOut size={16} />{leaving ? 'Đang đăng xuất…' : 'Đăng xuất'}</button></div></details>;
}
