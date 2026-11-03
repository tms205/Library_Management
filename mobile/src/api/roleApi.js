import client from './client';

// Lấy danh sách các nhóm quyền trong hệ thống
export const getPermissionGroupsApi = async () => {
  const response = await client.get('/api/admin/roles/groups');
  return response.data;
};

// Tìm kiếm danh sách tài khoản để phân quyền
export const searchAccountsForRolesApi = async (params = {}) => {
  const response = await client.get('/api/admin/roles/accounts', { params });
  return response.data;
};

// Cập nhật nhóm quyền mới cho tài khoản
export const updateAccountRoleApi = async (accountId, groupId) => {
  const response = await client.put(`/api/admin/roles/accounts/${accountId}`, {
    groupId,
  });
  return response.data;
};
