import { useMemo } from 'react';
import { getUserInfo } from '../utils/auth';
import UserLayout from './UserLayout';
import StaffLayout from './StaffLayout';
import AdminLayout from './AdminLayout';
import '../styles/layout.css';

/**
 * Intelligent Master Layout Dispatcher:
 * Automatically routes the logged-in user into their bespoke layout:
 * - USER: Elegant Modern Editorial Library (Top-Nav, full-width, book-centric)
 * - STAFF: Professional Operations Workspace (Circulation queue, quick actions)
 * - ADMIN: Premium Enterprise Console (System administration, security, audit)
 */
export default function MainLayout() {
  const user = getUserInfo();

  return useMemo(() => {
    if (user.isAdmin) {
      return <AdminLayout />;
    }
    if (user.isStaff) {
      return <StaffLayout />;
    }
    return <UserLayout />;
  }, [user.isAdmin, user.isStaff]);
}
