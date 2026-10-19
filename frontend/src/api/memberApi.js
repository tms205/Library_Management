import axiosClient from './axiosClient';

const API_URL = '/api/members';

export const searchMembers = (params) => {
  return axiosClient.get(`${API_URL}/search`, {
    params,
  });
};

export const createMember = (data) => {
  return axiosClient.post(API_URL, data);
};

export const updateMember = (id, data) => {
  return axiosClient.put(`${API_URL}/${id}`, data);
};

export const deleteMember = (id) => {
  return axiosClient.delete(`${API_URL}/${id}`);
};

export const getMemberById = (id) => {
  return axiosClient.get(`${API_URL}/${id}`);
};
