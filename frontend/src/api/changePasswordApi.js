import axiosClient from './axiosClient';

export const changePassword = (data) => {
  return axiosClient.put('/auth/change-password', data);
};
