import axiosClient from './axiosClient';

export const requestChangeEmail = (newEmail) => {
  return axiosClient.post('/auth/change-email/request', {
    newEmail,
  });
};

export const confirmChangeEmail = (code) => {
  return axiosClient.post('/auth/change-email/confirm', {
    code,
  });
};
