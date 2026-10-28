// mobile/src/utils/jwt.js
// Bộ giải mã JWT thuần JavaScript không phụ thuộc vào window.atob (tương thích React Native Hermes & JSC)

const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

export const b64DecodeUnicode = (input) => {
  if (!input || typeof input !== 'string') return '';
  let str = input.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  if (str.length % 4 === 1) {
    throw new Error('Độ dài Base64 không hợp lệ');
  }

  let output = '';
  for (
    let bc = 0, bs = 0, buffer, idx = 0;
    (buffer = str.charAt(idx++));
    ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
      ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
      : 0
  ) {
    buffer = b64chars.indexOf(buffer);
  }

  try {
    return decodeURIComponent(
      output
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
  } catch {
    return output;
  }
};

/**
 * Giải mã an toàn phần payload của JWT
 */
export const parseJwt = (token) => {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const jsonPayload = b64DecodeUnicode(parts[1]);
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.log('Không thể giải mã JWT:', error);
    return null;
  }
};

/**
 * Kiểm tra token có bị hết hạn hay không (có trừ hao 10 giây dự phòng)
 */
export const isTokenExpired = (token) => {
  try {
    if (!token) return true;
    const payload = parseJwt(token);
    if (!payload || !payload.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    // Trừ hao 10 giây để chủ động refresh trước khi token hết hạn thực tế trên backend
    return payload.exp <= now + 10;
  } catch {
    return true;
  }
};

/**
 * Trích xuất thông tin người dùng từ JWT
 */
export const getUserInfo = (token) => {
  const payload = parseJwt(token);
  if (!payload) return null;

  const email = payload.sub || payload.email || '';
  const role = payload.role || 'USER';
  const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];

  const isAdminOrStaff =
    role === 'ADMIN' ||
    role === 'STAFF' ||
    permissions.some((p) =>
      ['BORROW_APPROVE', 'MEMBER_VIEW', 'BOOK_CREATE', 'SYSTEM_MAINTENANCE'].includes(p),
    );

  return {
    sub: email,
    email,
    role,
    permissions,
    isAdminOrStaff,
  };
};
