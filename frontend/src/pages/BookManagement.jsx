import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { searchBooks, createBook, updateBook, deleteBook, importBooks } from '../api/bookApi';

import '../styles/books.css';

function BookManagement() {
  const [books, setBooks] = useState([]);

  const [title, setTitle] = useState('');
  const [isbn, setIsbn] = useState('');

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);

  const [searchFilters, setSearchFilters] = useState({
    title: '',
    isbn: '',
  });

  const [formData, setFormData] = useState({
    title: '',
    isbn: '',
    quantity: '',
    publishedDate: '',
  });

  const applyBookResponse = (response) => {
    const data = response.data;

    // Truong hop backend tra ve Spring Page<BookResponse>
    if (Array.isArray(data?.content)) {
      setBooks(data.content);
      setTotalPages(data.totalPages ?? 0);
      setHasNextPage(
        typeof data.last === 'boolean'
          ? !data.last
          : (data.number ?? page) < (data.totalPages ?? 1) - 1,
      );
      return;
    }

    // Truong hop backend dang tra ve List<BookResponse> co phan trang.
    // Frontend khong the biet tong so trang neu backend khong tra totalPages,
    // nen khong tu gan 1/1 nua.
    if (Array.isArray(data)) {
      setBooks(data);
      setTotalPages(null);

      // Neu du 10 record thi cho phep thu trang ke tiep.
      // Trang cuoi (< 10 record) se khoa nut Next.
      setHasNextPage(data.length === 10);
      return;
    }

    setBooks([]);
    setTotalPages(0);
    setHasNextPage(false);
  };

  const loadBooks = async (pageNumber, filterTitle, filterIsbn) => {
    try {
      const response = await searchBooks({
        title: filterTitle || undefined,
        isbn: filterIsbn || undefined,
        page: pageNumber,
        size: 10,
        sortBy: 'title',
        direction: 'asc',
      });

      applyBookResponse(response);
    } catch (error) {
      console.error(error);

      setBooks([]);
      setTotalPages(0);
      setHasNextPage(false);

      setMessageType('error');
      setMessage(error.response?.data?.message || 'Không thể tải danh sách sách!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchBooks = async () => {
      try {
        const response = await searchBooks({
          title: searchFilters.title || undefined,
          isbn: searchFilters.isbn || undefined,
          page,
          size: 10,
          sortBy: 'title',
          direction: 'asc',
        });

        if (cancelled) {
          return;
        }

        const data = response.data;

        if (Array.isArray(data?.content)) {
          setBooks(data.content);
          setTotalPages(data.totalPages ?? 0);
          setHasNextPage(
            typeof data.last === 'boolean'
              ? !data.last
              : (data.number ?? page) < (data.totalPages ?? 1) - 1,
          );
        } else if (Array.isArray(data)) {
          setBooks(data);
          setTotalPages(null);
          setHasNextPage(data.length === 10);
        } else {
          setBooks([]);
          setTotalPages(0);
          setHasNextPage(false);
        }

        setMessage('');
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(error);

        setBooks([]);
        setTotalPages(0);
        setHasNextPage(false);

        setMessageType('error');
        setMessage(error.response?.data?.message || 'Không thể tải danh sách sách!');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchBooks();

    return () => {
      cancelled = true;
    };
  }, [page, searchFilters.title, searchFilters.isbn]);

  const handleSearch = (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage('');

    const nextFilters = {
      title: title.trim(),
      isbn: isbn.trim(),
    };

    if (
      page === 0 &&
      searchFilters.title === nextFilters.title &&
      searchFilters.isbn === nextFilters.isbn
    ) {
      loadBooks(0, nextFilters.title, nextFilters.isbn);
      return;
    }

    setPage(0);
    setSearchFilters(nextFilters);
  };

  const handleResetSearch = () => {
    setTitle('');
    setIsbn('');
    setLoading(true);
    setMessage('');

    if (page === 0 && searchFilters.title === '' && searchFilters.isbn === '') {
      loadBooks(0, '', '');
      return;
    }

    setPage(0);
    setSearchFilters({
      title: '',
      isbn: '',
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const openCreateForm = () => {
    setEditingBook(null);

    setFormData({
      title: '',
      isbn: '',
      quantity: '',
      publishedDate: '',
    });

    setShowForm(true);
  };

  const openEditForm = (book) => {
    setEditingBook(book);

    setFormData({
      title: book.title || '',
      isbn: book.isbn || '',
      quantity: book.quantity ?? '',
      publishedDate: book.publishedDate || '',
    });

    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const data = {
        title: formData.title.trim(),
        isbn: formData.isbn.trim(),
        quantity: Number(formData.quantity),
        publishedDate: formData.publishedDate,
      };

      if (editingBook) {
        await updateBook(editingBook.id ?? editingBook.idLong, data);

        setMessageType('success');
        setMessage('Cập nhật sách thành công.');
      } else {
        await createBook(data);

        setMessageType('success');
        setMessage('Thêm sách thành công.');
      }

      setShowForm(false);
      setLoading(true);
      await loadBooks(page, searchFilters.title, searchFilters.isbn);
    } catch (error) {
      console.error(error);

      const data = error.response?.data;

      setMessageType('error');

      if (data?.message) {
        setMessage(data.message);
      } else if (data && typeof data === 'object') {
        setMessage(Object.values(data)[0] || 'Dữ liệu sách không hợp lệ!');
      } else {
        setMessage('Có lỗi xảy ra!');
      }
    }
  };

  const handleDelete = async (book) => {
    const id = book.id ?? book.idLong;

    const confirmed = window.confirm(`Bạn có chắc muốn xóa sách "${book.title}" không?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteBook(id);

      setMessageType('success');
      setMessage('Xóa sách thành công.');

      setLoading(true);
      await loadBooks(page, searchFilters.title, searchFilters.isbn);
    } catch (error) {
      console.error(error);

      setMessageType('error');
      setMessage(error.response?.data?.message || 'Không thể xóa sách!');
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setMessageType('error');
      setMessage('Chỉ hỗ trợ file CSV!');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessageType('error');
      setMessage('File phải nhỏ hơn 5MB!');
      event.target.value = '';
      return;
    }

    try {
      await importBooks(file);

      setMessageType('success');
      setMessage('Import sách thành công.');

      setLoading(true);
      await loadBooks(page, searchFilters.title, searchFilters.isbn);
    } catch (error) {
      console.error(error);

      setMessageType('error');
      setMessage(error.response?.data?.message || 'Import sách thất bại!');
    }

    event.target.value = '';
  };

  const getAuthors = (book) => {
    if (!book.authorNames) {
      return '—';
    }

    const authors = Array.from(book.authorNames);

    return authors.length > 0 ? authors.join(', ') : '—';
  };

  return (
    <main className="gt-page">
      <div className="gt-page-wrapper">
        <header className="gt-page-header">
          <div>
            <div className="gt-page-pretitle">Library / Catalog</div>

            <h1 className="gt-page-title">Quản lý sách</h1>

            <p className="gt-page-description">Tìm kiếm, cập nhật và quản lý kho sách thư viện.</p>
          </div>

          <div className="gt-page-actions">
            <Link to="/dashboard" className="gt-btn gt-btn-home">
              <span className="gt-home-arrow">←</span>
              Trang chủ
            </Link>

            <label className="gt-btn gt-btn-outline">
              <span className="gt-btn-icon">⇧</span>
              Import CSV
              <input type="file" accept=".csv" onChange={handleImport} hidden />
            </label>

            <button type="button" className="gt-btn gt-btn-primary" onClick={openCreateForm}>
              <span className="gt-btn-icon">＋</span>
              Thêm sách
            </button>
          </div>
        </header>

        {message && (
          <div
            className={`gt-alert ${
              messageType === 'error' ? 'gt-alert-error' : 'gt-alert-success'
            }`}
          >
            <span className="gt-alert-dot" />
            <span>{message}</span>

            <button
              type="button"
              className="gt-alert-close"
              onClick={() => setMessage('')}
              aria-label="Đóng thông báo"
            >
              ×
            </button>
          </div>
        )}

        <section className="gt-card gt-filter-card">
          <div className="gt-card-header">
            <div>
              <div className="gt-card-title">Bộ lọc tìm kiếm</div>

              <div className="gt-card-subtitle">Tìm theo tên sách hoặc ISBN</div>
            </div>
          </div>

          <div className="gt-card-body">
            <form className="gt-filter-form" onSubmit={handleSearch}>
              <div className="gt-field">
                <label htmlFor="book-title">Tên sách</label>

                <input
                  id="book-title"
                  type="text"
                  placeholder="Ví dụ: Clean Code"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>

              <div className="gt-field">
                <label htmlFor="book-isbn">ISBN</label>

                <input
                  id="book-isbn"
                  type="text"
                  placeholder="Nhập ISBN..."
                  value={isbn}
                  onChange={(event) => setIsbn(event.target.value)}
                />
              </div>

              <div className="gt-filter-actions">
                <button type="button" className="gt-btn gt-btn-outline" onClick={handleResetSearch}>
                  Đặt lại
                </button>

                <button type="submit" className="gt-btn gt-btn-primary">
                  Tìm kiếm
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="gt-card">
          <div className="gt-card-header">
            <div>
              <div className="gt-card-title">Danh sách sách</div>

              <div className="gt-card-subtitle">Tối đa 10 bản ghi mỗi trang</div>
            </div>

            <div className="gt-card-meta">
              {totalPages === null
                ? `Trang ${page + 1}`
                : `Trang ${totalPages === 0 ? 0 : page + 1} / ${totalPages}`}
            </div>
          </div>

          <div className="gt-card-body gt-card-body-table">
            {loading ? (
              <div className="gt-loading">
                <span className="gt-spinner" />
                Đang tải dữ liệu...
              </div>
            ) : (
              <div className="gt-table-responsive">
                <table className="gt-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tên sách</th>
                      <th>ISBN</th>
                      <th>Ngày xuất bản</th>
                      <th>Tác giả</th>
                      <th>Tồn kho</th>
                      <th>Trạng thái</th>
                      <th className="gt-table-actions-heading">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody>
                    {books.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="gt-empty-cell">
                          <div className="gt-empty-state">
                            <div className="gt-empty-icon">B</div>

                            <strong>Không tìm thấy sách</strong>

                            <span>Hãy thay đổi bộ lọc hoặc thêm sách mới.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      books.map((book) => {
                        const bookId = book.id ?? book.idLong;

                        const available = Number(book.quantity) > 0;

                        return (
                          <tr key={bookId}>
                            <td className="gt-cell-mono">#{bookId}</td>

                            <td>
                              <div className="gt-book-cell">
                                <div className="gt-book-mark">
                                  {book.title?.charAt(0).toUpperCase() || 'B'}
                                </div>

                                <span className="gt-cell-strong">{book.title}</span>
                              </div>
                            </td>

                            <td className="gt-cell-mono gt-isbn">{book.isbn}</td>

                            <td>{book.publishedDate || '—'}</td>

                            <td className="gt-authors">{getAuthors(book)}</td>

                            <td className="gt-cell-strong">{book.quantity}</td>

                            <td>
                              <span
                                className={`gt-status ${
                                  available ? 'gt-status-green' : 'gt-status-red'
                                }`}
                              >
                                {available ? 'Còn sách' : 'Hết sách'}
                              </span>
                            </td>

                            <td>
                              <div className="gt-row-actions">
                                <button
                                  type="button"
                                  className="gt-action-btn"
                                  onClick={() => openEditForm(book)}
                                >
                                  Sửa
                                </button>

                                <button
                                  type="button"
                                  className="gt-action-btn gt-action-danger"
                                  onClick={() => handleDelete(book)}
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="gt-card-footer">
            <div className="gt-pagination-info">
              {books.length > 0
                ? `Hiển thị ${books.length} bản ghi trên trang này`
                : 'Không có dữ liệu'}
            </div>

            <div className="gt-pagination">
              <button
                type="button"
                className="gt-page-btn"
                disabled={page === 0}
                onClick={() => {
                  setLoading(true);
                  setPage((current) => current - 1);
                }}
              >
                ‹
              </button>

              <span className="gt-page-current">{totalPages === 0 ? 0 : page + 1}</span>

              <button
                type="button"
                className="gt-page-btn"
                disabled={
                  totalPages === null ? !hasNextPage : totalPages === 0 || page >= totalPages - 1
                }
                onClick={() => {
                  setLoading(true);
                  setPage((current) => current + 1);
                }}
              >
                ›
              </button>
            </div>
          </div>
        </section>
      </div>

      {showForm && (
        <div
          className="gt-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowForm(false);
            }
          }}
        >
          <div
            className="gt-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="book-modal-title"
          >
            <div className="gt-modal-header">
              <div>
                <div className="gt-modal-pretitle">BOOK</div>

                <h2 id="book-modal-title">{editingBook ? 'Cập nhật sách' : 'Thêm sách mới'}</h2>
              </div>

              <button
                type="button"
                className="gt-modal-close"
                onClick={() => setShowForm(false)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <form className="gt-book-form" onSubmit={handleSubmit}>
              <div className="gt-field gt-field-full">
                <label htmlFor="form-title">Tên sách</label>

                <input
                  id="form-title"
                  type="text"
                  name="title"
                  placeholder="Nhập tên sách"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="gt-form-grid">
                <div className="gt-field">
                  <label htmlFor="form-isbn">ISBN</label>

                  <input
                    id="form-isbn"
                    type="text"
                    name="isbn"
                    placeholder="Nhập ISBN"
                    value={formData.isbn}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="gt-field">
                  <label htmlFor="form-quantity">Số lượng</label>

                  <input
                    id="form-quantity"
                    type="number"
                    name="quantity"
                    min="0"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="gt-field gt-field-full">
                <label htmlFor="form-date">Ngày xuất bản</label>

                <input
                  id="form-date"
                  type="date"
                  name="publishedDate"
                  value={formData.publishedDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="gt-modal-footer">
                <button
                  type="button"
                  className="gt-btn gt-btn-outline"
                  onClick={() => setShowForm(false)}
                >
                  Hủy
                </button>

                <button type="submit" className="gt-btn gt-btn-primary">
                  {editingBook ? 'Lưu thay đổi' : 'Thêm sách'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default BookManagement;
