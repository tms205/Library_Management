import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import '../styles/layout.css';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="lib-layout-container">
      {/* Sidebar cố định bên trái, giữ nguyên trạng thái khi đổi trang */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Backdrop mờ che khi mở menu trên điện thoại / tablet */}
      {sidebarOpen && (
        <div
          className="lib-mobile-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Vùng nội dung bên phải gồm Topbar và Page Content động */}
      <div className="lib-main-wrapper">
        <Topbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="lib-content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
