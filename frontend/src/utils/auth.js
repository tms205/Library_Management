import axiosClient from '../api/axiosClient';

// Helper functions quản lý token và kiểm tra quyền hạn (permissions) thực tế từ JWT

export const getAccessToken = () => {
  return localStorage.getItem('accessToken');
};

export const getRefreshToken = () => {
  return localStorage.getItem('refreshToken');
};

/**
 * Giải mã an toàn phần payload của JWT Base64Url
 */
export const parseJwt = (token = getAccessToken()) => {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

/**
 * Kiểm tra token có hợp lệ và còn hạn không
 */
export const isTokenValid = (token = getAccessToken()) => {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
};

/**
 * Lấy danh sách permission thực tế từ JWT
 */
export const getPermissionsFromToken = (token = getAccessToken()) => {
  const payload = parseJwt(token);
  if (!payload) return [];
  if (Array.isArray(payload.permissions)) {
    return payload.permissions;
  }
  return [];
};

/**
 * Kiểm tra xem user có một quyền cụ thể hay không
 */
export const hasPermission = (permission, token = getAccessToken()) => {
  if (!permission) return true;
  const permissions = getPermissionsFromToken(token);
  return permissions.includes(permission);
};

/**
 * Kiểm tra xem user có ít nhất một quyền trong danh sách không
 */
export const hasAnyPermission = (permissionList = [], token = getAccessToken()) => {
  if (!permissionList || permissionList.length === 0) return true;
  const permissions = getPermissionsFromToken(token);
  return permissionList.some((perm) => permissions.includes(perm));
};

/**
 * Kiểm tra xem user có tất cả các quyền trong danh sách không
 */
export const hasAllPermissions = (permissionList = [], token = getAccessToken()) => {
  if (!permissionList || permissionList.length === 0) return true;
  const permissions = getPermissionsFromToken(token);
  return permissionList.every((perm) => permissions.includes(perm));
};

/**
 * Lấy thông tin user hiển thị từ token
 */
export const getUserInfo = (token = getAccessToken()) => {
  const payload = parseJwt(token);
  if (!payload) {
    return {
      email: '',
      username: 'User',
      role: 'USER',
      permissions: [],
      groupName: 'Độc giả',
      badgeColor: 'blue',
    };
  }

  const email = payload.sub || '';
  const username = email ? email.split('@')[0] : 'User';
  const role = payload.role || 'USER';
  const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];

  // Xác định nhóm phân quyền thân thiện để hiển thị
  let groupName = 'Độc giả';
  let badgeColor = 'blue';
  let roleType = 'USER';

  if (permissions.includes('SYSTEM_MAINTENANCE') || role === 'ADMIN') {
    groupName = 'Admin';
    badgeColor = 'purple';
    roleType = 'ADMIN';
  } else if (
    permissions.includes('BORROW_APPROVE') ||
    permissions.includes('RETURN_CONFIRM') ||
    role === 'STAFF'
  ) {
    groupName = 'Thủ thư (Staff)';
    badgeColor = 'amber';
    roleType = 'STAFF';
  } else if (permissions.includes('BORROW_BOOK')) {
    groupName = 'Độc giả (User)';
    badgeColor = 'emerald';
    roleType = 'USER';
  } else if (permissions.includes('BOOK_VIEW')) {
    groupName = 'Khách xem (View)';
    badgeColor = 'slate';
    roleType = 'USER';
  }

  return {
    email,
    username,
    role,
    permissions,
    groupName,
    badgeColor,
    roleType,
    isAdmin: roleType === 'ADMIN',
    isStaff: roleType === 'STAFF',
    isUser: roleType === 'USER',
  };
};

/**
 * Đăng xuất: gọi API blacklist access token & thu hồi refresh token trong DB,
 * dọn sạch storage và chuyển hướng về trang login
 */
export const logout = async () => {
  const refreshToken = getRefreshToken();

  try {
    // Gọi API logout qua axiosClient để đính kèm access token hiện tại
    // và gửi kèm refresh token để backend thu hồi triệt để trong cơ sở dữ liệu
    await axiosClient.post('/auth/logout', {
      refreshToken: refreshToken || '',
    });
  } catch {
    // Local credentials must also be cleared if the logout endpoint is unavailable.
  } finally {
    // Luôn dọn dẹp sạch sẽ storage và chuyển hướng về trang đăng nhập
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }
};
