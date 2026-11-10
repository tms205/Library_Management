export function errorMessage(error, fallback = 'Không thể thực hiện yêu cầu. Vui lòng thử lại.') {
  const data = error?.response?.data;
  if (typeof data === 'string' && !data.trim().startsWith('<')) return data;
  if (typeof data?.message === 'string') return data.message;
  if (data && typeof data === 'object') {
    const field = Object.entries(data).find(([key, value]) => !['timestamp', 'status', 'path', 'error', 'trace'].includes(key) && typeof value === 'string');
    if (field) return field[1];
  }
  return ({ 401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 403: 'Tài khoản của bạn không có quyền thực hiện thao tác này.', 404: 'Không tìm thấy dữ liệu được yêu cầu.', 409: 'Dữ liệu đã thay đổi hoặc đang được sử dụng.', 422: 'Vui lòng kiểm tra lại thông tin đã nhập.', 500: 'Máy chủ gặp sự cố. Vui lòng thử lại sau.' })[error?.response?.status] || fallback;
}
