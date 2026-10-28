import client from './client';

export const borrowBooksApi = async (bookIds) => {
  const ids = Array.isArray(bookIds) ? bookIds.map(Number) : [Number(bookIds)];
  const response = await client.post('/api/borrow', {
    bookIds: ids,
  });
  return response.data;
};

export const getMyBorrowedBooksApi = async () => {
  const response = await client.get('/api/borrow/me');
  return response.data;
};

export const requestReturnApi = async (borrowRecordId) => {
  const response = await client.put(`/api/borrow/${borrowRecordId}/request-return`);
  return response.data;
};

// Staff / Admin: Lấy danh sách quản lý mượn trả (hỗ trợ tìm kiếm & lọc)
export const getBorrowManagementApi = async (params) => {
  const response = await client.get('/api/borrow/manage', { params });
  return response.data;
};

// Staff / Admin: Duyệt yêu cầu mượn
export const approveBorrowApi = async (borrowRecordId) => {
  const response = await client.put(`/api/borrow/${borrowRecordId}/approve`);
  return response.data;
};

// Staff / Admin: Từ chối yêu cầu mượn
export const rejectBorrowApi = async (borrowRecordId) => {
  const response = await client.put(`/api/borrow/${borrowRecordId}/reject`);
  return response.data;
};

// Staff / Admin: Xác nhận đã nhận lại sách
export const confirmReturnApi = async (borrowRecordId) => {
  const response = await client.put(`/api/borrow/${borrowRecordId}/confirm-return`);
  return response.data;
};
