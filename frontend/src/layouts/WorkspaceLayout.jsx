import AccountMenu from '../components/AccountMenu';
import NotificationBell from '../components/NotificationBell';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Library, Users, ClipboardList, ShieldCheck, SlidersHorizontal, LogOut, KeyRound, Mail, Menu, X, PanelLeftClose, PanelLeftOpen, ArrowUpRight } from 'lucide-react';
import { getUserInfo, hasAnyPermission, hasPermission, logout } from '../utils/auth';
import Brand from '../components/Brand';
import ThemeToggle from '../components/ThemeToggle';
import Modal from '../components/Modal';
const groups = [
  { label: 'THƯ VIỆN', items: [
    { to: '/dashboard', label: 'Tổng quan', Icon: LayoutDashboard },
    { to: '/books/manage', label: 'Quản lý sách', Icon: Library, permissions: ['BOOK_CREATE', 'BOOK_UPDATE', 'BOOK_DELETE', 'BOOK_IMPORT'], view: 'BOOK_VIEW' },
    { to: '/books', label: 'Danh mục sách', Icon: Library, permissions: ['BOOK_VIEW'], catalog: true },
    { to: '/members', label: 'Độc giả', Icon: Users, permissions: ['MEMBER_VIEW'] },
    { to: '/borrow-management', label: 'Mượn & trả sách', Icon: ClipboardList, permissions: ['BORROW_APPROVE'] },
  ] },
  { label: 'QUẢN TRỊ', items: [
    { to: '/roles', label: 'Phân quyền', Icon: ShieldCheck, permissions: ['SYSTEM_MAINTENANCE'] },
    { to: '/system-config', label: 'Cấu hình hệ thống', Icon: SlidersHorizontal, permissions: ['SYSTEM_MAINTENANCE'] },
  ] },
  { label: 'TÀI KHOẢN', items: [
    { to: '/change-password', label: 'Đổi mật khẩu', Icon: KeyRound },
    { to: '/change-email', label: 'Đổi email', Icon: Mail },
  ] },
];
export default function WorkspaceLayout({ kind }) {
  const user = getUserInfo();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('aura-sidebar') === 'collapsed');
  const canManage = hasAnyPermission(['BOOK_CREATE', 'BOOK_UPDATE', 'BOOK_DELETE', 'BOOK_IMPORT']);
  const sections = groups.map((g) => ({ ...g, items: g.items.filter((i) => (!i.permissions || hasAnyPermission(i.permissions)) && (!i.view || hasPermission(i.view)) && (!i.catalog || !canManage)) })).filter((g) => g.items.length);
  const title = sections.flatMap((g) => g.items).find((i) => i.to === location.pathname)?.label || 'Thư viện';
  const roleLabel = kind === 'admin' ? 'Không gian quản trị' : 'Bàn làm việc thủ thư';
  const navigation = <><div className="workspace-brand"><Link to="/dashboard" aria-label="Aura Library - Trang chủ"><Brand compact={collapsed && !open} /></Link><button type="button" className="icon-button mobile-only" aria-label="Đóng menu" onClick={() => setOpen(false)}><X size={20} /></button></div><div className="workspace-role"><span className="role-dot" />{roleLabel}</div><nav aria-label="Điều hướng chính" className="workspace-nav">{sections.map((g) => <div key={g.label} className="nav-section"><span className="nav-section-label">{g.label}</span>{g.items.map(({ to, label, Icon }) => <NavLink key={to} to={to} end title={collapsed ? label : undefined} onClick={() => setOpen(false)} className={({ isActive }) => `workspace-nav-link ${isActive ? 'active' : ''}`}><Icon size={19} strokeWidth={1.7} /><span>{label}</span></NavLink>)}</div>)}</nav><div className="workspace-sidebar-bottom"><div className="workspace-user"><span className="avatar">{user.username.charAt(0).toUpperCase()}</span><div><strong>{user.username}</strong><small>{user.email}</small></div><button type="button" className="icon-button" onClick={logout} aria-label="Đăng xuất" title="Đăng xuất"><LogOut size={17} /></button></div></div></>;
  return <div className={`workspace ${collapsed ? 'is-collapsed' : ''}`}><a className="skip-link" href="#main-content">Đến nội dung chính</a><aside className="workspace-sidebar">{navigation}</aside>{open && <Modal onClose={() => setOpen(false)} className="navigation-drawer" labelledBy="drawer-title"><h2 id="drawer-title" className="sr-only">Menu thư viện</h2>{navigation}</Modal>}<div className="workspace-body"><header className="workspace-topbar"><div className="topbar-leading"><button type="button" className="icon-button desktop-only" aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'} onClick={() => { setCollapsed(!collapsed); localStorage.setItem('aura-sidebar', collapsed ? 'expanded' : 'collapsed'); }}>{collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button><button type="button" className="icon-button mobile-only" aria-label="Mở menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20} /></button><span className="workspace-breadcrumb">Thư viện <span>/</span> <strong>{title}</strong></span></div><div className="topbar-actions">{hasPermission('BOOK_VIEW') && <Link to="/books" className="topbar-catalog">Tra cứu sách <ArrowUpRight size={15} /></Link>}<NotificationBell /><ThemeToggle /><AccountMenu /></div></header><main id="main-content" className="workspace-content" tabIndex={-1}><Outlet /></main><footer className="workspace-footer"><span>Aura Library · {roleLabel}</span><span>Không gian cho tri thức</span></footer></div></div>;
}
