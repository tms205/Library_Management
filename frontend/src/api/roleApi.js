import axiosClient from './axiosClient';

const API_URL = '/api/admin/roles';

// Lấy danh sách các nhóm quyền trong hệ thống
export const getPermissionGroups = () => {
  return axiosClient.get(`${API_URL}/groups`);
};

// Lấy toàn bộ danh sách quyền hạn (Permissions) của hệ thống
export const getAllPermissions = () => {
  return axiosClient.get(`${API_URL}/permissions`);
};

// Tạo mới một nhóm quyền tùy chỉnh
export const createPermissionGroup = (data) => {
  return axiosClient.post(`${API_URL}/groups`, data);
};

// Cập nhật thông tin và danh sách quyền của nhóm
export const updatePermissionGroup = (groupId, data) => {
  return axiosClient.put(`${API_URL}/groups/${groupId}`, data);
};

// Xóa nhóm quyền tùy chỉnh (chỉ cho phép khi nhóm không phải mặc định và chưa có tài khoản nào được gán)
export const deletePermissionGroup = (groupId) => {
  return axiosClient.delete(`${API_URL}/groups/${groupId}`);
};

// Lấy danh sách tài khoản thuộc một nhóm quyền
export const getAccountsInGroup = (groupId, params) => {
  return axiosClient.get(`${API_URL}/groups/${groupId}/accounts`, {
    params,
  });
};

// Tìm kiếm danh sách tài khoản để phân quyền
export const searchAccountsForRoles = (params) => {
  return axiosClient.get(`${API_URL}/accounts`, {
    params,
  });
};

// Cập nhật nhóm quyền mới cho tài khoản
export const updateAccountRole = (accountId, groupId) => {
  return axiosClient.put(`${API_URL}/accounts/${accountId}`, {
    groupId,
  });
};
