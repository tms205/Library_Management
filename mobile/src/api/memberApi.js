import client from './client';

export const searchMembersApi = async (params = {}) => {
  const response = await client.get('/api/members/search', {
    params: {
      fullName: params.fullName || undefined,
      phone: params.phone || undefined,
      address: params.address || undefined,
      page: params.page ?? 0,
      size: params.size ?? 10,
      sortBy: 'id',
      direction: 'desc',
    },
  });
  return response.data;
};

export const getMemberByIdApi = async (id) => {
  const response = await client.get(`/api/members/${id}`);
  return response.data;
};

export const createMemberApi = async (data) => {
  const response = await client.post('/api/members', data);
  return response.data;
};

export const updateMemberApi = async (id, data) => {
  const response = await client.put(`/api/members/${id}`, data);
  return response.data;
};

export const deleteMemberApi = async (id) => {
  const response = await client.delete(`/api/members/${id}`);
  return response.data;
};

// Khóa / Mở khóa tài khoản độc giả
export const toggleMemberStatusApi = async (id, enabled) => {
  const params = enabled !== undefined ? { enabled } : {};
  const response = await client.put(`/api/members/${id}/status`, null, { params });
  return response.data;
};
