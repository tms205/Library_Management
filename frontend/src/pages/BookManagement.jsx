import { useEffect, useState } from 'react';
import { searchBooks, createBook, updateBook, deleteBook, importBooks } from '../api/bookApi';
import { hasPermission } from '../utils/auth';

import '../styles/books.css';

function BookManagement() {
  // Quyền hạn thực tế từ JWT
  const canCreate = hasPermission('BOOK_CREATE');
  const canUpdate = hasPermission('BOOK_UPDATE');
  const canDelete = hasPermission('BOOK_DELETE');
  const canImport = hasPermission('BOOK_IMPORT');
  const hasRowActions = canUpdate || canDelete;

  // Danh sách sách hiển thị trên trang hiện tại
  const [books, setBooks] = useState([]);

  // State tạm thời của các ô nhập trong form bộ lọc (người dùng gõ ở đây)
  const [title, setTitle] = useState('');
  const [isbn, setIsbn] = useState('');
  const [author, setAuthor] = useState('');
  const [stockStatus, setStockStatus] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [direction, setDirection] = useState('asc');

  // Quản lý phân trang
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);

  // Bộ lọc CHÍNH THỨC đang áp dụng gọi API (chỉ cập nhật khi bấm "Tìm kiếm" hoặc "Đặt lại")
  // Tách biệt với state ô nhập ở trên để tránh gõ 1 chữ lại gọi API 1 lần gây lag UI
  const [searchFilters, setSearchFilters] = useState({
    title: '',
    isbn: '',
    author: '',
    stockStatus: 'ALL',
    fromDate: '',
    toDate: '',
    sortBy: 'title',
    direction: 'asc',
  });

  // Chế độ xem: 'grid' (dạng thẻ có ảnh bìa - mặc định) hoặc 'table' (dạng bảng truyền thống)
  const [viewMode, setViewMode] = useState('grid');

  const [formData, setFormData] = useState({
    title: '',
    isbn: '',
    quantity: '',
    publishedDate: '',
    image: '',
  });

  const applyBookResponse = (response) => {
    const data = response.data;

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

    if (Array.isArray(data)) {
      setBooks(data);
      setTotalPages(null);
      setHasNextPage(data.length === 10);
      return;
    }

    setBooks([]);
    setTotalPages(0);
    setHasNextPage(false);
  };

  const buildQueryParams = (pageNumber, filters) => {
    const params = {
      page: pageNumber,
      size: 10,
      sortBy: filters.sortBy || 'title',
      direction: filters.direction || 'asc',
    };

    if (filters.title) params.title = filters.title;
    if (filters.isbn) params.isbn = filters.isbn;
    if (filters.author) params.author = filters.author;
    if (filters.stockStatus === 'IN_STOCK') params.inStock = true;
    if (filters.stockStatus === 'OUT_OF_STOCK') params.inStock = false;
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;

    return params;
  };

  const loadBooks = async (pageNumber, filters = searchFilters) => {
    try {
      const response = await searchBooks(buildQueryParams(pageNumber, filters));
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
        const response = await searchBooks(buildQueryParams(page, searchFilters));

        if (cancelled) {
          return;
        }

        applyBookResponse(response);
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
  }, [page, searchFilters]);

  const handleSearch = (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage('');

    const nextFilters = {
      title: title.trim(),
      isbn: isbn.trim(),
      author: author.trim(),
      stockStatus,
      fromDate,
      toDate,
      sortBy,
      direction,
    };

    setPage(0);
    setSearchFilters(nextFilters);
  };

  const handleResetSearch = () => {
    setTitle('');
    setIsbn('');
    setAuthor('');
    setStockStatus('ALL');
    setFromDate('');
    setToDate('');
    setSortBy('title');
    setDirection('asc');

    setLoading(true);
    setMessage('');

    setPage(0);
    setSearchFilters({
      title: '',
      isbn: '',
      author: '',
      stockStatus: 'ALL',
      fromDate: '',
      toDate: '',
      sortBy: 'title',
      direction: 'asc',
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
      image: '',
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
      image: book.image || '',
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
        image: formData.image ? formData.image.trim() : null,
      };

      if (editingBook) {
        await updateBook(editingBook.id, data);

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
    const id = book.id;

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
      await loadBooks(page, searchFilters);
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

  const hasActiveFilters = Boolean(
    searchFilters.title ||
    searchFilters.isbn ||
    searchFilters.author ||
    searchFilters.stockStatus !== 'ALL' ||
    searchFilters.fromDate ||
    searchFilters.toDate ||
    searchFilters.sortBy !== 'title' ||
    searchFilters.direction !== 'asc',
  );

  return (
    <div className="gt-page">
      <div className="gt-page-wrapper">
        <header className="gt-page-header">
          <div>
            <div className="gt-page-pretitle">Library / Catalog</div>
            <h1 className="gt-page-title">
              {canCreate || canUpdate ? 'Quản lý kho sách' : 'Danh mục sách'}
            </h1>
            <p className="gt-page-description">
              Tìm kiếm, tra cứu và quản lý các đầu sách trong hệ thống thư viện.
            </p>
          </div>

          <div className="gt-page-actions">
            {/* BOOK_IMPORT: Chỉ hiển thị nút Import CSV khi có quyền */}
            {canImport && (
              <label className="gt-btn gt-btn-outline" style={{ cursor: 'pointer' }}>
                <span className="gt-btn-icon">⇧</span>
                Import CSV
                <input type="file" accept=".csv" onChange={handleImport} hidden />
              </label>
            )}

            {/* BOOK_CREATE: Chỉ hiển thị nút Thêm sách khi có quyền */}
            {canCreate && (
              <button type="button" className="gt-btn gt-btn-primary" onClick={openCreateForm}>
                <span className="gt-btn-icon">＋</span>
                Thêm sách mới
              </button>
            )}
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
              <div className="gt-card-title">Bộ lọc tìm kiếm nâng cao</div>
              <div className="gt-card-subtitle">
                Tìm kiếm theo tên sách, tác giả, ISBN, tình trạng kho và thời gian xuất bản
              </div>
            </div>
            {hasActiveFilters && (
              <span className="gt-badge gt-badge-info" style={{ alignSelf: 'center' }}>
                ● Đang lọc kết quả
              </span>
            )}
          </div>

          <div className="gt-card-body">
            <form className="gt-filter-form" onSubmit={handleSearch}>
              <div className="gt-field">
                <label htmlFor="book-title">Tên cuốn sách</label>
                <input
                  id="book-title"
                  type="text"
                  placeholder="Ví dụ: Clean Code, Java..."
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>

              <div className="gt-field">
                <label htmlFor="book-author">Tác giả</label>
                <input
                  id="book-author"
                  type="text"
                  placeholder="Ví dụ: Robert C. Martin..."
                  value={author}
                  onChange={(event) => setAuthor(event.target.value)}
                />
              </div>

              <div className="gt-field">
                <label htmlFor="book-isbn">Mã ISBN</label>
                <input
                  id="book-isbn"
                  type="text"
                  placeholder="Ví dụ: 978-..."
                  value={isbn}
                  onChange={(event) => setIsbn(event.target.value)}
                />
              </div>

              <div className="gt-field">
                <label htmlFor="book-stock">Tình trạng kho</label>
                <select
                  id="book-stock"
                  value={stockStatus}
                  onChange={(event) => setStockStatus(event.target.value)}
                >
                  <option value="ALL">Tất cả tình trạng</option>
                  <option value="IN_STOCK">Còn sách sẵn sàng</option>
                  <option value="OUT_OF_STOCK">Tạm hết sách</option>
                </select>
              </div>

              <div className="gt-field">
                <label htmlFor="book-from-date">Xuất bản từ ngày</label>
                <input
                  id="book-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                />
              </div>

              <div className="gt-field">
                <label htmlFor="book-to-date">Đến ngày</label>
                <input
                  id="book-to-date"
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </div>

              <div className="gt-field">
                <label htmlFor="book-sort">Sắp xếp theo</label>
                <select
                  id="book-sort"
                  value={`${sortBy}-${direction}`}
                  onChange={(event) => {
                    const [field, dir] = event.target.value.split('-');
                    setSortBy(field);
                    setDirection(dir);
                  }}
                >
                  <option value="title-asc">Tên sách (A → Z)</option>
                  <option value="title-desc">Tên sách (Z → A)</option>
                  <option value="publishedDate-desc">Ngày xuất bản (Mới nhất)</option>
                  <option value="publishedDate-asc">Ngày xuất bản (Cũ nhất)</option>
                  <option value="quantity-desc">Số lượng kho (Nhiều nhất)</option>
                  <option value="quantity-asc">Số lượng kho (Ít nhất)</option>
                </select>
              </div>

              <div className="gt-filter-actions">
                <button
                  type="button"
                  className="gt-btn gt-btn-outline"
                  onClick={handleResetSearch}
                >
                  ✕ Đặt lại bộ lọc
                </button>

                <button type="submit" className="gt-btn gt-btn-primary">
                  🔍 Tìm kiếm
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="gt-card">
          <div className="gt-card-header">
            <div>
              <div className="gt-card-title">Danh sách đầu sách</div>
              <div className="gt-card-subtitle">Hiển thị trực quan dạng thẻ có hình ảnh bìa</div>
            </div>

            <div className="gt-card-header-right">
              {/* Toggle dạng thẻ / dạng bảng */}
              <div className="gt-view-toggle">
                <button
                  type="button"
                  className={`gt-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Hiển thị dạng thẻ (Card)"
                >
                  🗂️ Dạng thẻ
                </button>
                <button
                  type="button"
                  className={`gt-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Hiển thị dạng bảng (Table)"
                >
                  📋 Dạng bảng
                </button>
              </div>

              <div className="gt-card-meta">
                {totalPages === null
                  ? `Trang ${page + 1}`
                  : `Trang ${totalPages === 0 ? 0 : page + 1} / ${totalPages}`}
              </div>
            </div>
          </div>

          <div className={`gt-card-body ${viewMode === 'table' ? 'gt-card-body-table' : ''}`}>
            {loading ? (
              <div className="gt-loading">
                <span className="gt-spinner" />
                Đang tải dữ liệu...
              </div>
            ) : books.length === 0 ? (
              <div className="gt-empty-state" style={{ padding: '48px 24px' }}>
                <div className="gt-empty-icon">📖</div>
                <strong>Không tìm thấy cuốn sách nào</strong>
                <span>Hãy thử thay đổi từ khóa bộ lọc hoặc tải lại trang.</span>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="gt-cards-container">
                <div className="gt-book-cards-grid">
                  {books.map((book) => {
                    const bookId = book.id;
                    const available = Number(book.quantity) > 0;
                    const authors = getAuthors(book);

                    return (
                      <div key={bookId} className="gt-book-card">
                        {/* Khung ảnh bìa sách */}
                        <div className="gt-book-cover-container">
                          {book.image ? (
                            <img
                              src={book.image}
                              alt={book.title}
                              className="gt-book-cover-img"
                              loading="lazy"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextElementSibling) {
                                  e.target.nextElementSibling.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className="gt-book-cover-fallback"
                            style={{ display: book.image ? 'none' : 'flex' }}
                          >
                            <span className="gt-fallback-icon">📚</span>
                            <span className="gt-fallback-title">{book.title}</span>
                          </div>

                          {/* ID và Trạng thái */}
                          <div className="gt-card-badge-id">#{bookId}</div>
                          <div
                            className={`gt-card-badge-status ${
                              available ? 'gt-badge-available' : 'gt-badge-out'
                            }`}
                          >
                            {available ? `Còn ${book.quantity}` : 'Hết sách'}
                          </div>
                        </div>

                        {/* Thân thẻ thông tin */}
                        <div className="gt-book-card-body">
                          <h3 className="gt-book-card-title" title={book.title}>
                            {book.title}
                          </h3>

                          <div className="gt-book-card-meta">
                            <div className="gt-card-meta-row">
                              <span className="gt-card-meta-label">✍️ Tác giả:</span>
                              <span className="gt-card-meta-value" title={authors}>
                                {authors || 'Chưa cập nhật'}
                              </span>
                            </div>

                            <div className="gt-card-meta-row">
                              <span className="gt-card-meta-label">🏷️ ISBN:</span>
                              <span className="gt-card-meta-value mono">{book.isbn}</span>
                            </div>

                            <div className="gt-card-meta-row">
                              <span className="gt-card-meta-label">📅 Ngày XB:</span>
                              <span className="gt-card-meta-value">{book.publishedDate || '—'}</span>
                            </div>
                          </div>

                          {/* Thao tác Sửa / Xóa */}
                          {hasRowActions && (
                            <div className="gt-book-card-footer">
                              {canUpdate && (
                                <button
                                  type="button"
                                  className="gt-btn-card-edit"
                                  onClick={() => openEditForm(book)}
                                >
                                  ✏️ Sửa
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  type="button"
                                  className="gt-btn-card-delete"
                                  onClick={() => handleDelete(book)}
                                  title="Xóa sách"
                                >
                                  🗑️ Xóa
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="gt-table-responsive">
                <table className="gt-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Bìa sách</th>
                      <th>Tên sách</th>
                      <th>ISBN</th>
                      <th>Ngày xuất bản</th>
                      <th>Tác giả</th>
                      <th>Tồn kho</th>
                      <th>Trạng thái</th>
                      {/* Ẩn hẳn cột thao tác nếu tài khoản không có quyền Sửa lẫn Xóa */}
                      {hasRowActions && <th className="gt-table-actions-heading">Thao tác</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {books.map((book) => {
                      const bookId = book.id;
                      const available = Number(book.quantity) > 0;

                      return (
                        <tr key={bookId}>
                          <td className="gt-cell-mono">#{bookId}</td>

                          <td>
                            <div className="gt-table-thumb-wrap">
                              {book.image ? (
                                <img
                                  src={book.image}
                                  alt={book.title}
                                  className="gt-table-thumb"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    if (e.target.nextElementSibling) {
                                      e.target.nextElementSibling.style.display = 'flex';
                                    }
                                  }}
                                />
                              ) : null}
                              <div
                                className="gt-table-thumb-fallback"
                                style={{ display: book.image ? 'none' : 'flex' }}
                              >
                                {book.title?.charAt(0).toUpperCase() || 'B'}
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="gt-cell-strong">{book.title}</span>
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

                          {/* Nút hành động theo quyền thực tế */}
                          {hasRowActions && (
                            <td>
                              <div className="gt-row-actions">
                                {canUpdate && (
                                  <button
                                    type="button"
                                    className="gt-action-btn"
                                    onClick={() => openEditForm(book)}
                                  >
                                    Sửa
                                  </button>
                                )}

                                {canDelete && (
                                  <button
                                    type="button"
                                    className="gt-action-btn gt-action-danger"
                                    onClick={() => handleDelete(book)}
                                  >
                                    Xóa
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
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
                <div className="gt-modal-pretitle">BOOK MANAGEMENT</div>
                <h2 id="book-modal-title">{editingBook ? 'Cập nhật thông tin sách' : 'Thêm sách mới vào kho'}</h2>
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
                  <label htmlFor="form-isbn">Mã ISBN</label>

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
                  <label htmlFor="form-quantity">Số lượng tồn kho</label>

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

              <div className="gt-field gt-field-full">
                <label htmlFor="form-image">Đường dẫn ảnh bìa (URL ảnh)</label>

                <input
                  id="form-image"
                  type="url"
                  name="image"
                  placeholder="https://images.unsplash.com/... hoặc link ảnh bất kỳ"
                  value={formData.image}
                  onChange={handleChange}
                />

                {formData.image && (
                  <div className="gt-image-preview-box">
                    <span className="gt-preview-label">Xem trước ảnh:</span>
                    <img
                      src={formData.image}
                      alt="Xem trước ảnh bìa"
                      className="gt-image-preview-thumb"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                      onLoad={(e) => {
                        e.target.style.display = 'block';
                      }}
                    />
                  </div>
                )}
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
    </div>
  );
}

export default BookManagement;
