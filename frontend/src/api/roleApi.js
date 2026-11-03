import axiosClient from './axiosClient';

const API_URL = '/api/admin/roles';

// Lấy danh sách các nhóm quyền trong hệ thống
export const getPermissionGroups = () => {
  return axiosClient.get(`${API_URL}/groups`);
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
