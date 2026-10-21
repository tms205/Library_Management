import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isTokenValid, getAccessToken } from '../utils/auth';

export default function ProtectedRoute() {
  const location = useLocation();
  const token = getAccessToken();

  if (!token || !isTokenValid(token)) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
