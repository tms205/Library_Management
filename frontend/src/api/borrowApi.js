import axiosClient from './axiosClient';

const API_URL = '/api/borrow';

// MUON NHIEU SACH
export const borrowBooks = (data) => {
  return axiosClient.post(API_URL, data);
};

// LAY SACH CUA USER DANG LOGIN
export const getMyBorrowedBooks = () => {
  return axiosClient.get(`${API_URL}/me`);
};

// TRA 1 SACH
export const returnBook = (borrowRecordId) => {
  return axiosClient.put(`${API_URL}/${borrowRecordId}/return`);
};
