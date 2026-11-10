import { useSearchParams } from 'react-router-dom';
import ErrorState from '../components/ErrorState';
import { useEffect, useState } from 'react';
import { borrowBooks } from '../api/borrowApi';
import { searchBooks } from '../api/bookApi';
import { getUserInfo } from '../utils/auth';
import { useToast } from '../context/ToastContext';
import { SkeletonTable } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  RotateCcw,
  Search,
  BookMarked,
  Inbox,
  ShoppingBag,
} from 'lucide-react';

import '../styles/borrow.css';

function BorrowBook() {
  const user = getUserInfo();
  const [urlParams] = useSearchParams();
  const toast = useToast();

  const [books, setBooks] = useState([]);
  const [selectedBookIds, setSelectedBookIds] = useState([]);

  const [title, setTitle] = useState(urlParams.get('title') || '');
  const [isbn, setIsbn] = useState('');

  const [searchFilters, setSearchFilters] = useState({
    title: urlParams.get('title') || '',
    isbn: '',
  });

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(null);
  const [totalElements, setTotalElements] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);

  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadingBorrow, setLoadingBorrow] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Confirm dialog state
  const [confirmBorrowOpen, setConfirmBorrowOpen] = useState(false);

  const normalizeBook = (book) => ({
    ...book,
    id: book.id ?? book.idLong,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchBooks = async () => {
      try {
        setLoadingBooks(true);
        setLoadError('');
        const response = await searchBooks({
          title: searchFilters.title || undefined,
          isbn: searchFilters.isbn || undefined,
          page: page,
          size: 10,
          sortBy: 'title',
          direction: 'asc',
        });

        if (cancelled) return;

        const data = response.data;

        if (Array.isArray(data?.content)) {
          const normalized = data.content.map(normalizeBook);
          setBooks(normalized);
          setTotalPages(data.totalPages ?? 0);
          setTotalElements(data.totalElements ?? normalized.length);
          setHasNextPage(
            typeof data.last === 'boolean' ? !data.last : page < (data.totalPages ?? 1) - 1,
          );
          return;
        }

        if (Array.isArray(data)) {
          const normalized = data.map(normalizeBook);
          setBooks(normalized);
          setTotalPages(null);
          setTotalElements(normalized.length);
          setHasNextPage(data.length === 10);
          return;
        }

        setBooks([]);
        setTotalPages(0);
        setTotalElements(0);
        setHasNextPage(false);
      } catch (error) {
        if (cancelled) return;
        setLoadError(error.response?.data?.message || 'Không thể tải danh sách sách.');

        setBooks([]);
        setTotalPages(0);
        setTotalElements(0);
        setHasNextPage(false);

        toast.error(
          error.response?.data?.message ||
            error.response?.data?.error ||
            'Không thể tải danh sách sách!',
        );
      } finally {
        if (!cancelled) {
          setLoadingBooks(false);
        }
      }
    };

    Promise.resolve().then(() => { if (!cancelled) fetchBooks(); });
    return () => {
      cancelled = true;
    };
  }, [page, searchFilters, reloadKey, toast]);

  const handleSearch = (event) => {
    event.preventDefault();
    setLoadingBooks(true);
    setPage(0);

    setSearchFilters({
      title: title.trim(),
      isbn: isbn.trim(),
    });
  };

  const handleResetSearch = () => {
    setTitle('');
    setIsbn('');
    setLoadingBooks(true);
    setPage(0);

    setSearchFilters({
      title: '',
      isbn: '',
    });
  };

  const handleToggleBook = (bookId) => {
    if (bookId === null || bookId === undefined) return;

    setSelectedBookIds((prev) => {
      if (prev.includes(bookId)) {
        return prev.filter((id) => id !== bookId);
      }
      return [...prev, bookId];
    });
  };

  const handleInitiateBorrow = () => {
    if (selectedBookIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một cuốn sách còn trong kho!');
      return;
    }

    const validBookIds = selectedBookIds
      .filter((id) => id !== null && id !== undefined && !isNaN(Number(id)) && Number(id) > 0)
      .map((id) => Number(id));

    if (validBookIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một cuốn sách hợp lệ!');
      return;
    }

    setConfirmBorrowOpen(true);
  };

  const handleConfirmBorrow = async () => {
    if (loadingBorrow) return;
    const validBookIds = selectedBookIds
      .filter((id) => id !== null && id !== undefined && !isNaN(Number(id)) && Number(id) > 0)
      .map((id) => Number(id));

    const payload = { bookIds: validBookIds, requestId: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + "-" + Math.random().toString(36).substring(2, 9)) };

    try {
      setLoadingBorrow(true);
      await borrowBooks(payload);

      toast.success(
        `Gửi yêu cầu mượn ${validBookIds.length} cuốn sách thành công! Vui lòng chờ thủ thư xét duyệt.`,
      );
      setSelectedBookIds([]);
      setReloadKey((current) => current + 1);
      setConfirmBorrowOpen(false);
    } catch (error) {

      const data = error.response?.data;

      if (typeof data === 'string') {
        toast.error(data);
      } else if (data?.message) {
        toast.error(data.message);
      } else if (data?.error) {
        toast.error(data.error);
      } else if (data && typeof data === 'object') {
        const fieldErrors = Object.entries(data)
          .filter(([key]) => !['timestamp', 'status', 'error', 'path'].includes(key))
          .map(([, value]) => value);

        toast.error(fieldErrors[0] || 'Thông tin mượn sách chưa hợp lệ!');
      } else {
        toast.error('Không thể gửi yêu cầu mượn sách!');
      }
    } finally {
      setLoadingBorrow(false);
    }
  };

  return (
    <div className="borrow-page">
      <div className="borrow-page-wrapper">
        <header className="borrow-page-header">
          <div>
            <div className="borrow-page-pretitle">THƯ VIỆN / MƯỢN SÁCH</div>
            <h1>Mượn sách trực tuyến</h1>
            <p>Chọn các đầu sách bạn muốn mượn từ danh mục thư viện và gửi yêu cầu phê duyệt.</p>
          </div>
        </header>

        {/* Khối xác nhận giỏ sách đã chọn */}
        <section className="borrow-card">
          <div className="borrow-card-header">
            <div>
              <h2>Giỏ sách đăng ký mượn</h2>
              <p>Bạn có thể chọn đồng thời nhiều cuốn sách còn trong kho để gửi yêu cầu mượn cùng lúc.</p>
            </div>

            <div className="borrow-card-badge">
              <ShoppingBag size={14} style={{ display: 'inline', marginRight: '4px' }} />
              {selectedBookIds.length} CUỐN SÁCH
            </div>
          </div>

          <div className="borrow-info-grid">
            <div className="borrow-selected-box">
              <span>Tài khoản độc giả mượn</span>
              <strong>{user.email || user.username}</strong>
            </div>

            <div className="borrow-selected-box">
              <span>Số lượng sách đã chọn</span>
              <strong style={{ color: 'var(--primary-accent)' }}>{selectedBookIds.length} cuốn</strong>
            </div>
          </div>

          <div className="borrow-confirm-row">
            <button
              type="button"
              className="btn btn-outline"
              disabled={selectedBookIds.length === 0}
              onClick={() => setSelectedBookIds([])}
            >
              Bỏ chọn tất cả
            </button>

            <button
              type="button"
              className="btn btn-primary"
              disabled={loadingBorrow || selectedBookIds.length === 0}
              onClick={handleInitiateBorrow}
            >
              {loadingBorrow ? (
                <>
                  <span className="spinner" />
                  <span>Đang gửi yêu cầu...</span>
                </>
              ) : (
                <>
                  <BookMarked size={16} />
                  <span>Gửi yêu cầu mượn ({selectedBookIds.length})</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Khối tra cứu & danh sách sách */}
        <section className="borrow-card">
          <div className="borrow-card-header">
            <div>
              <h2>Tra cứu & Chọn sách vào giỏ</h2>
              <p>Đánh dấu vào ô vuông để chọn sách cần mượn (sách hết kho sẽ bị khóa chọn).</p>
            </div>
          </div>

          <form className="borrow-search-form" onSubmit={handleSearch}>
            <div className="borrow-field">
              <label htmlFor="borrow-title-input">Tên cuốn sách</label>
              <input
                id="borrow-title-input"
                type="text"
                placeholder="Ví dụ: Clean Code, Design Patterns..."
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div className="borrow-field">
              <label htmlFor="borrow-isbn-input">Mã ISBN</label>
              <input
                id="borrow-isbn-input"
                type="text"
                placeholder="Ví dụ: 978-..."
                value={isbn}
                onChange={(event) => setIsbn(event.target.value)}
              />
            </div>

            <div className="borrow-search-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleResetSearch}
              >
                <RotateCcw size={15} /> Đặt lại
              </button>

              <button type="submit" className="btn btn-primary">
                <Search size={15} /> Tìm kiếm
              </button>
            </div>
          </form>

          <div className="borrow-book-list">
            {loadingBooks ? (
              <div style={{ padding: '8px 0' }}>
                <SkeletonTable rows={6} cols={6} />
              </div>
            ) : loadError ? (<ErrorState message={loadError} onRetry={() => setReloadKey((v) => v + 1)} />) : books.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Không tìm thấy sách nào"
                description={
                  searchFilters.title || searchFilters.isbn
                    ? 'Không có cuốn sách nào khớp với điều kiện tìm kiếm. Hãy thử từ khóa khác hoặc đặt lại bộ lọc.'
                    : 'Hiện tại chưa có đầu sách nào sẵn sàng trong kho thư viện.'
                }
                primaryAction={
                  searchFilters.title || searchFilters.isbn
                    ? {
                        label: 'Đặt lại bộ lọc',
                        onClick: handleResetSearch,
                      }
                    : undefined
                }
              />
            ) : (
              <div className="borrow-table-wrapper">
                <table className="borrow-table">
                  <thead>
                    <tr>
                      <th style={{ width: '64px', textAlign: 'center' }}>Chọn</th>
                      <th>Mã sách</th>
                      <th>Tên đầu sách</th>
                      <th>Mã ISBN</th>
                      <th>Số lượng kho</th>
                      <th>Tình trạng</th>
                    </tr>
                  </thead>

                  <tbody>
                    {books.map((book) => {
                      const isChecked = selectedBookIds.includes(book.id);
                      const available = Number(book.quantity) > 0;

                      return (
                        <tr key={book.id} className={isChecked ? 'borrow-row-selected' : ''}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={!available}
                              onChange={() => handleToggleBook(book.id)}
                              style={{ width: '18px', height: '18px', cursor: available ? 'pointer' : 'not-allowed' }}
                              aria-label={`Chọn sách ${book.title}`}
                            />
                          </td>

                          <td className="borrow-mono">#{book.id}</td>
                          <td className="borrow-book-name">{book.title}</td>
                          <td className="borrow-mono">{book.isbn}</td>
                          <td><strong>{book.quantity}</strong></td>

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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="borrow-card-footer">
            <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
              Đang chọn <strong style={{ color: 'var(--primary-accent)' }}>{selectedBookIds.length}</strong> cuốn sách
            </span>

            <Pagination
              page={page}
              totalPages={totalPages ?? (hasNextPage ? page + 2 : page + 1)}
              totalElements={totalElements}
              pageSize={10}
              onPageChange={(newPage) => {
                setLoadingBooks(true);
                setPage(newPage);
              }}
            />
          </div>
        </section>
      </div>

      {/* Dialog xác nhận gửi yêu cầu mượn sách */}
      <ConfirmDialog
        isOpen={confirmBorrowOpen}
        title="Xác nhận mượn sách"
        message={`Bạn đang đăng ký mượn ${selectedBookIds.length} cuốn sách từ thư viện. Yêu cầu sẽ được chuyển đến thủ thư xét duyệt. Bạn có muốn tiếp tục không?`}
        confirmText="Gửi yêu cầu mượn"
        cancelText="Kiểm tra lại"
        variant="info"
        isLoading={loadingBorrow}
        onConfirm={handleConfirmBorrow}
        onCancel={() => setConfirmBorrowOpen(false)}
      />
    </div>
  );
}

export default BorrowBook;

