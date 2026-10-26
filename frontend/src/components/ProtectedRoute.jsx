import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getAccessToken } from '../utils/auth';

export default function ProtectedRoute() {
  const location = useLocation();
  const token = getAccessToken();

  // Chỉ về login khi hoàn toàn không có access token.
  // Token hết hạn sẽ để axiosClient xử lý Refresh Token.
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
