import Modal from '../components/Modal';
import ErrorState from '../components/ErrorState';
import BookDetails from '../components/BookDetails';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchBooks, createBook, updateBook, deleteBook, importBooks } from '../api/bookApi';
import { hasPermission } from '../utils/auth';
import { useToast } from '../context/ToastContext';
import BookCard from '../components/BookCard';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { SkeletonTable, SkeletonBookCardGrid } from '../components/Skeleton';
import {
  Upload,
  Plus,
  Search,
  RotateCcw,
  LayoutGrid,
  Table as TableIcon,
  X,
  AlertCircle,
  RefreshCw,
  Filter,
} from 'lucide-react';

import '../styles/books.css';

function BookCatalog() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTitle = searchParams.get('title') || '';

  // Quyền hạn thực tế từ JWT
  const canCreate = hasPermission('BOOK_CREATE');
  const canUpdate = hasPermission('BOOK_UPDATE');
  const canDelete = hasPermission('BOOK_DELETE');
  const canImport = hasPermission('BOOK_IMPORT');
  const canBorrow = hasPermission('BORROW_BOOK');
  const hasRowActions = canUpdate || canDelete;

  // Danh sách sách hiển thị
  const [books, setBooks] = useState([]);

  // State bộ lọc tìm kiếm
  const [title, setTitle] = useState(urlTitle);
  const [isbn, setIsbn] = useState('');
  const [author, setAuthor] = useState('');
  const [stockStatus, setStockStatus] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [direction, setDirection] = useState('asc');

  // Quản lý phân trang & Tổng số lượng
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(null);
  const [totalElements, setTotalElements] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Modal xác nhận xóa
  const [bookToDelete, setBookToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);

  // Bộ lọc chính thức áp dụng gọi API
  const [searchFilters, setSearchFilters] = useState({
    title: urlTitle,
    isbn: '',
    author: '',
    stockStatus: 'ALL',
    fromDate: '',
    toDate: '',
    sortBy: 'title',
    direction: 'asc',
  });

  const [viewMode, setViewMode] = useState(() => canCreate || canUpdate || canDelete || canImport ? 'table' : 'grid');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [detailBook, setDetailBook] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    isbn: '',
    quantity: '',
    publishedDate: '',
    image: '',
  });

  const [formErrors, setFormErrors] = useState({});

  const applyBookResponse = useCallback((response) => {
    const data = response.data;

    if (Array.isArray(data?.content)) {
      setBooks(data.content);
      setTotalPages(data.totalPages ?? 0);
      setTotalElements(data.totalElements ?? data.content.length);
      setHasNextPage(
        typeof data.last === 'boolean'
          ? !data.last
          : (data.number ?? 0) < (data.totalPages ?? 1) - 1,
      );
      return;
    }

    if (Array.isArray(data)) {
      setBooks(data);
      setTotalPages(null);
      setTotalElements(data.length);
      setHasNextPage(data.length === 10);
      return;
    }

    setBooks([]);
    setTotalPages(0);
    setTotalElements(0);
    setHasNextPage(false);
  }, []);

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

  useEffect(() => {
    let cancelled = false;

    const fetchBooks = async () => {
      try {
        setLoading(true);
        const response = await searchBooks(buildQueryParams(page, searchFilters));
        if (cancelled) return;
        const pages = response.data?.totalPages;
        if (page > 0 && Number.isInteger(pages) && page >= pages) { setPage(Math.max(0, pages - 1)); return; }
        applyBookResponse(response);
        setMessage('');
      } catch (error) {
        if (cancelled) return;

        setBooks([]);
        setTotalPages(0);
        setHasNextPage(false);
        setTotalElements(0);
        setMessage(error.response?.data?.message || 'Không thể tải danh sách sách!');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    Promise.resolve().then(() => { if (!cancelled) fetchBooks(); });
    return () => {
      cancelled = true;
    };
  }, [page, searchFilters, applyBookResponse, revision]);

  // Cập nhật số lượng tồn kho Real-time qua SSE khi có thủ thư duyệt mượn hoặc xác nhận trả sách
  useEffect(() => {
    const handleInventoryChanged = (e) => {
      const { bookId, quantity } = e.detail || {};
      if (bookId != null && quantity != null) {
        setBooks((prevBooks) =>
          prevBooks.map((b) => (b.id === bookId ? { ...b, quantity } : b))
        );
      }
    };
    window.addEventListener('book-inventory-changed', handleInventoryChanged);
    return () => {
      window.removeEventListener('book-inventory-changed', handleInventoryChanged);
    };
  }, []);

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

    const emptyFilters = {
      title: '',
      isbn: '',
      author: '',
      stockStatus: 'ALL',
      fromDate: '',
      toDate: '',
      sortBy: 'title',
      direction: 'asc',
    };
    setSearchFilters(emptyFilters);

    if (searchParams.get('title')) {
      setSearchParams({});
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const openCreateForm = () => {
    setEditingBook(null);
    setFormErrors({});
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
    setFormErrors({});
    setFormData({
      title: book.title || '',
      isbn: book.isbn || '',
      quantity: book.quantity ?? '',
      publishedDate: book.publishedDate || '',
      image: book.image || '',
    });
    setShowForm(true);
  };

  const validateModalForm = () => {
    const err = {};
    if (!formData.title.trim()) err.title = 'Tên sách không được để trống!';
    if (!formData.isbn.trim()) err.isbn = 'Mã ISBN không được để trống!';
    if (formData.quantity === '' || formData.quantity === null || isNaN(formData.quantity)) {
      err.quantity = 'Số lượng không được để trống!';
    } else if (!Number.isInteger(Number(formData.quantity)) || Number(formData.quantity) < 0) {
      err.quantity = 'Số lượng phải là số nguyên lớn hơn hoặc bằng 0!';
    }
    if (!formData.publishedDate) err.publishedDate = 'Thời gian xuất bản không được để trống!';

    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving || !validateModalForm()) return;

    try {
      setSaving(true);
      const data = {
        title: formData.title.trim(),
        isbn: formData.isbn.trim(),
        quantity: Number(formData.quantity),
        publishedDate: formData.publishedDate,
        image: formData.image ? formData.image.trim() : null,
      };

      if (editingBook) {
        await updateBook(editingBook.id, data);
        toast.success(`Cập nhật thông tin sách "${data.title}" thành công.`);
      } else {
        await createBook(data);
        toast.success(`Thêm mới sách "${data.title}" vào kho thành công.`);
      }

      setShowForm(false);
      setLoading(true);
      setRevision((v) => v + 1);
    } catch (error) {

      const data = error.response?.data;
      if (data?.message) {
        toast.error(data.message);
      } else if (data && typeof data === 'object') {
        toast.error(Object.values(data)[0] || 'Dữ liệu sách không hợp lệ!');
      } else {
        toast.error('Có lỗi xảy ra khi lưu sách!');
      }
    } finally { setSaving(false); }
  };

  const confirmDeleteBook = async () => {
    if (!bookToDelete || isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteBook(bookToDelete.id);
      toast.success(`Xóa thành công đầu sách "${bookToDelete.title}".`);
      setBookToDelete(null);
      setLoading(true);
      setRevision((v) => v + 1);
    } catch (error) {

      toast.error(error.response?.data?.message || 'Không thể xóa cuốn sách này!');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file || importing) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Chỉ hỗ trợ định dạng file CSV!');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dung lượng file CSV phải nhỏ hơn 5MB!');
      event.target.value = '';
      return;
    }

    try {
      setImporting(true);
      await importBooks(file);
      toast.success('Import dữ liệu sách từ file CSV thành công!');
      setLoading(true);
      setRevision((v) => v + 1);
    } catch (error) {

      toast.error(error.response?.data?.message || 'Import sách thất bại!');
    } finally { setImporting(false); }
    event.target.value = '';
  };

  const getAuthors = (book) => {
    if (!book.authorNames) return '—';
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
            <div className="gt-page-pretitle">THƯ VIỆN / DANH MỤC</div>
            <h1 className="gt-page-title">
              {canCreate || canUpdate || canDelete || canImport ? 'Quản lý kho sách' : 'Danh mục sách'}
            </h1>
            <p className="gt-page-description">
              {canCreate || canUpdate || canDelete || canImport ? 'Tra cứu, cập nhật và quản lý tồn kho đầu sách.' : 'Tìm một cuốn sách mới, hoặc tiếp tục hành trình đọc của bạn.'}
            </p>
          </div>

          <div className="gt-page-actions"><button type="button" className="btn btn-outline" disabled={loading} onClick={() => { setLoading(true); setMessage(''); setRevision((v) => v + 1); }}><RefreshCw size={15} />Làm mới</button>
            {canImport && (
              <label className="btn btn-outline csv-upload" style={{ cursor: 'pointer' }}>
                <Upload size={16} />
                <span>{importing ? 'Đang nhập…' : 'Nhập CSV'}</span>
                <input type="file" accept=".csv" disabled={importing} onChange={handleImport} className="sr-only" />
              </label>
            )}

            {canCreate && (
              <button type="button" className="btn btn-primary" onClick={openCreateForm}>
                <Plus size={16} />
                <span>Thêm sách mới</span>
              </button>
            )}
          </div>
        </header>

        {/* BỘ LỌC TÌM KIẾM */}
        <section className="gt-card gt-filter-card">
          <div className="gt-card-header">
            <div>
              <div className="gt-card-title">Bộ lọc tìm kiếm nâng cao</div>
              <div className="gt-card-subtitle">
                Tìm kiếm theo tên sách, tác giả, ISBN, tình trạng kho và thời gian xuất bản
              </div>
            </div>
            {hasActiveFilters && (
              <span className="badge-clean badge-info" style={{ alignSelf: 'center' }}>
                <Filter size={12} /> Đang áp dụng lọc
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
                  className="btn btn-outline"
                  onClick={handleResetSearch}
                >
                  <RotateCcw size={15} /> Đặt lại bộ lọc
                </button>

                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Search size={15} /> Tìm kiếm
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* DANH SÁCH ĐẦU SÁCH */}
        <section className="gt-card">
          <div className="gt-card-header">
            <div>
              <div className="gt-card-title">Danh sách đầu sách</div>
              <div className="gt-card-subtitle">{totalElements.toLocaleString('vi-VN')} đầu sách phù hợp</div>
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
                  <LayoutGrid size={15} /> Dạng thẻ
                </button>
                <button
                  type="button"
                  className={`gt-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Hiển thị dạng bảng (Table)"
                >
                  <TableIcon size={15} /> Dạng bảng
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
              viewMode === 'grid' ? (
                <SkeletonBookCardGrid count={8} />
              ) : (
                <SkeletonTable rows={8} cols={hasRowActions ? 9 : 8} />
              )
            ) : message ? (<ErrorState message={message} onRetry={() => { setLoading(true); setMessage(''); setRevision((v) => v + 1); }} />) : books.length === 0 ? (
              <EmptyState
                title="Không tìm thấy cuốn sách nào"
                description="Không có tài liệu nào phù hợp với bộ lọc tìm kiếm hiện tại. Hãy thử đặt lại bộ lọc hoặc tạo đầu sách mới."
                actionLabel={canCreate ? 'Thêm sách mới' : undefined}
                onAction={canCreate ? openCreateForm : undefined}
                secondaryActionLabel="Đặt lại bộ lọc"
                onSecondaryAction={handleResetSearch}
              />
            ) : viewMode === 'grid' ? (
              <div className="gt-book-grid">
                {books.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    canBorrow={canBorrow}
                    onBorrow={() => navigate(`/borrow?title=${encodeURIComponent(book.title)}`)}
                    canEdit={canUpdate}
                    onEdit={() => openEditForm(book)}
                    canDelete={canDelete}
                    onDelete={() => setBookToDelete(book)}
                  />
                ))}
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
                            <button type="button" className="table-title-button" onClick={() => setDetailBook(book)}>{book.title}</button>
                          </td>
                          <td className="gt-cell-mono gt-isbn">{book.isbn}</td>
                          <td>{book.publishedDate || '—'}</td>
                          <td className="gt-authors">{getAuthors(book)}</td>
                          <td className="gt-cell-strong">{book.quantity}</td>
                          <td>
                            <span
                              className={`badge-clean ${
                                available ? 'badge-success' : 'badge-danger'
                              }`}
                            >
                              <span className="badge-dot" style={{ backgroundColor: available ? '#059669' : '#dc2626' }} />
                              {available ? 'Còn sách' : 'Hết sách'}
                            </span>
                          </td>

                          {hasRowActions && (
                            <td>
                              <div className="gt-row-actions">
                                {canUpdate && (
                                  <button
                                    type="button"
                                    className="btn btn-outline"
                                    style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                                    onClick={() => openEditForm(book)}
                                  >
                                    Sửa
                                  </button>
                                )}

                                {canDelete && (
                                  <button
                                    type="button"
                                    className="btn btn-danger"
                                    style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                                    onClick={() => setBookToDelete(book)}
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
            <Pagination
              page={page}
              totalPages={totalPages ?? (hasNextPage ? page + 2 : page + 1)}
              totalElements={totalElements}
              pageSize={10}
              onPageChange={(newPage) => {
                setLoading(true);
                setPage(newPage);
              }}
            />
          </div>
        </section>
      </div>

      {/* FORM MODAL THÊM / SỬA SÁCH */}
      {showForm && (
        <Modal className="gt-modal" onClose={() => setShowForm(false)} busy={saving} labelledBy="book-modal-title">
            <div className="gt-modal-header">
              <div>
                <div className="gt-modal-pretitle">THÔNG TIN SÁCH</div>
                <h2 id="book-modal-title">{editingBook ? 'Cập nhật thông tin sách' : 'Thêm sách mới vào kho'}</h2>
              </div>

              <button
                type="button"
                className="gt-modal-close"
                disabled={saving} onClick={() => setShowForm(false)}
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <form className="gt-book-form" onSubmit={handleSubmit} noValidate>
              <div className="gt-field gt-field-full">
                <label htmlFor="form-title">Tên sách *</label>
                <input
                  id="form-title"
                  type="text"
                  name="title"
                  className={formErrors.title ? 'input-error' : ''}
                  placeholder="Nhập tên sách..."
                  value={formData.title}
                  onChange={handleChange}
                />
                {formErrors.title && <span className="field-error"><AlertCircle size={13} />{formErrors.title}</span>}
              </div>

              <div className="gt-form-grid">
                <div className="gt-field">
                  <label htmlFor="form-isbn">Mã ISBN *</label>
                  <input
                    id="form-isbn"
                    type="text"
                    name="isbn"
                    className={formErrors.isbn ? 'input-error' : ''}
                    placeholder="Nhập mã ISBN..."
                    value={formData.isbn}
                    onChange={handleChange}
                  />
                  {formErrors.isbn && <span className="field-error"><AlertCircle size={13} />{formErrors.isbn}</span>}
                </div>

                <div className="gt-field">
                  <label htmlFor="form-quantity">Số lượng tồn kho *</label>
                  <input
                    id="form-quantity"
                    type="number"
                    name="quantity"
                    className={formErrors.quantity ? 'input-error' : ''}
                    min="0"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={handleChange}
                  />
                  {formErrors.quantity && <span className="field-error"><AlertCircle size={13} />{formErrors.quantity}</span>}
                </div>
              </div>

              <div className="gt-field gt-field-full">
                <label htmlFor="form-date">Ngày xuất bản *</label>
                <input
                  id="form-date"
                  type="date"
                  name="publishedDate"
                  className={formErrors.publishedDate ? 'input-error' : ''}
                  value={formData.publishedDate}
                  onChange={handleChange}
                />
                {formErrors.publishedDate && <span className="field-error"><AlertCircle size={13} />{formErrors.publishedDate}</span>}
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
                  className="btn btn-outline"
                  disabled={saving} onClick={() => setShowForm(false)}
                >
                  Hủy
                </button>

                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu…' : editingBook ? 'Lưu thay đổi' : 'Thêm sách'}
                </button>
              </div>
            </form>
        </Modal>
      )}

      <BookDetails book={detailBook} onClose={() => setDetailBook(null)} canBorrow={canBorrow} />
      {/* Accessible Destructive Delete Book Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(bookToDelete)}
        variant="danger"
        title="Xác nhận xóa đầu sách"
        message="Hành động này sẽ xóa cuốn sách này khỏi danh mục kho sách của thư viện. Hãy kiểm tra chắc chắn rằng cuốn sách không còn độc giả nào đang giữ."
        highlightText={bookToDelete ? `"${bookToDelete.title}" (ISBN: ${bookToDelete.isbn || 'N/A'})` : ''}
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy bỏ"
        isLoading={isDeleting}
        onConfirm={confirmDeleteBook}
        onCancel={() => setBookToDelete(null)}
      />
    </div>
  );
}

export default function BookManagement() {
  const [params] = useSearchParams();
  return <BookCatalog key={params.get('title') || ''} />;
}
