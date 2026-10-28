import client from './client';

export const getBooksApi = async (params = {}) => {
  const queryParams = {
    page: params.page ?? 0,
    size: params.size ?? 10,
    sortBy: params.sortBy || 'id',
    direction: params.direction || 'desc',
  };

  if (params.title) queryParams.title = params.title.trim();
  if (params.isbn) queryParams.isbn = params.isbn.trim();
  if (params.author) queryParams.author = params.author.trim();
  if (typeof params.inStock === 'boolean') queryParams.inStock = params.inStock;
  if (params.fromDate) queryParams.fromDate = params.fromDate;
  if (params.toDate) queryParams.toDate = params.toDate;

  const response = await client.get('/api/books/search', {
    params: queryParams,
  });
  return response.data;
};

export const getBookDetailApi = async (id) => {
  const response = await client.get(`/api/books/${id}`);
  return response.data;
};

export const createBookApi = async (data) => {
  const response = await client.post('/api/books', data);
  return response.data;
};

export const updateBookApi = async (id, data) => {
  const response = await client.put(`/api/books/${id}`, data);
  return response.data;
};

export const deleteBookApi = async (id) => {
  const response = await client.delete(`/api/books/${id}`);
  return response.data;
};
