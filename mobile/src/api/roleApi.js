import client from './client';

// Lấy danh sách các nhóm quyền trong hệ thống
export const getPermissionGroupsApi = async () => {
  const response = await client.get('/api/admin/roles/groups');
  return response.data;
};

// Lấy toàn bộ danh sách quyền hạn (Permissions) trong hệ thống
export const getAllPermissionsApi = async () => {
  const response = await client.get('/api/admin/roles/permissions');
  return response.data;
};

// Tạo mới một nhóm quyền tùy chỉnh (Dynamic RBAC)
export const createPermissionGroupApi = async (data) => {
  const response = await client.post('/api/admin/roles/groups', data);
  return response.data;
};

// Cập nhật thông tin và danh sách quyền của nhóm
export const updatePermissionGroupApi = async (groupId, data) => {
  const response = await client.put(`/api/admin/roles/groups/${groupId}`, data);
  return response.data;
};

// Xóa nhóm quyền tùy chỉnh (khi chưa có tài khoản nào được gán)
export const deletePermissionGroupApi = async (groupId) => {
  const response = await client.delete(`/api/admin/roles/groups/${groupId}`);
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
