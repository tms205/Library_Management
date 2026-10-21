import axiosClient from './axiosClient';

const API_URL = '/api/borrow';

// GUI YEU CAU MUON NHIEU SACH
export const borrowBooks = (data) => {
  return axiosClient.post(API_URL, data);
};

// LAY TAT CA SACH/YEU CAU CUA USER DANG LOGIN
export const getMyBorrowedBooks = () => {
  return axiosClient.get(`${API_URL}/me`);
};

// USER YEU CAU TRA SACH
export const requestReturn = (borrowRecordId) => {
  return axiosClient.put(`${API_URL}/${borrowRecordId}/request-return`);
};

// STAFF / ADMIN: LAY DANH SACH QUAN LY MUON TRA
export const getBorrowManagement = () => {
  return axiosClient.get(`${API_URL}/manage`);
};

// STAFF / ADMIN: DUYET YEU CAU MUON
export const approveBorrow = (borrowRecordId) => {
  return axiosClient.put(`${API_URL}/${borrowRecordId}/approve`);
};

// STAFF / ADMIN: TU CHOI YEU CAU MUON
export const rejectBorrow = (borrowRecordId) => {
  return axiosClient.put(`${API_URL}/${borrowRecordId}/reject`);
};

// STAFF / ADMIN: XAC NHAN DA NHAN LAI SACH
export const confirmReturn = (borrowRecordId) => {
  return axiosClient.put(`${API_URL}/${borrowRecordId}/confirm-return`);
};
