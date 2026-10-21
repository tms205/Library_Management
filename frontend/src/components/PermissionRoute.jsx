import { Outlet } from 'react-router-dom';
import { hasAnyPermission, hasAllPermissions } from '../utils/auth';
import Forbidden from '../pages/Forbidden';

export default function PermissionRoute({ permissions = [], permission = null, requireAll = false }) {
  const checkList = permission ? [permission] : Array.isArray(permissions) ? permissions : [permissions];

  const allowed = requireAll
    ? hasAllPermissions(checkList)
    : hasAnyPermission(checkList);

  if (!allowed) {
    return <Forbidden />;
  }

  return <Outlet />;
}
