import { useMemo } from 'react';
import { getUserInfo } from '../utils/auth';
import UserDashboard from './UserDashboard';
import StaffDashboard from './StaffDashboard';
import AdminDashboard from './AdminDashboard';
import '../styles/dashboard.css';

/**
 * Role-Based Dashboard Switcher:
 * Directs the user to their bespoke, dedicated workspace:
 * - USER: Modern Editorial Book Discovery Experience
 * - STAFF: Professional Library Circulation Workspace
 * - ADMIN: Enterprise Executive Console
 */
export default function Dashboard() {
  const user = getUserInfo();

  return useMemo(() => {
    if (user.isAdmin) {
      return <AdminDashboard />;
    }
    if (user.isStaff) {
      return <StaffDashboard />;
    }
    return <UserDashboard />;
  }, [user.isAdmin, user.isStaff]);
}
