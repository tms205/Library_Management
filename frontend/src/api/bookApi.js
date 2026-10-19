import axiosClient from './axiosClient';

const API_URL = '/api/books';

export const searchBooks = (params) => {
  return axiosClient.get(`${API_URL}/search`, {
    params,
  });
};

export const createBook = (data) => {
  return axiosClient.post(API_URL, data);
};

export const updateBook = (id, data) => {
  return axiosClient.put(`${API_URL}/${id}`, data);
};

export const deleteBook = (id) => {
  return axiosClient.delete(`${API_URL}/${id}`);
};

export const importBooks = (file) => {
  const formData = new FormData();

  formData.append('file', file);

  return axiosClient.post(`${API_URL}/import`, formData);
};
