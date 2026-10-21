import { useEffect, useState } from 'react';
import { borrowBooks } from '../api/borrowApi';
import { searchBooks } from '../api/bookApi';
import { getUserInfo } from '../utils/auth';

import '../styles/borrow.css';

function BorrowBook() {
  const user = getUserInfo();

  const [books, setBooks] = useState([]);
  // Quản lý danh sách ID sách được chọn độc lập
  const [selectedBookIds, setSelectedBookIds] = useState([]);

  const [title, setTitle] = useState('');
  const [isbn, setIsbn] = useState('');

  const [searchFilters, setSearchFilters] = useState({
    title: '',
    isbn: '',
  });

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);

  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingBorrow, setLoadingBorrow] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  // Chuẩn hóa Book object: đảm bảo luôn có book.id là số nguyên hợp lệ
  const normalizeBook = (book) => ({
    ...book,
    id: book.id ?? book.idLong,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchBooks = async () => {
      try {
        const response = await searchBooks({
          title: searchFilters.title || undefined,
          isbn: searchFilters.isbn || undefined,
          page: page,
          size: 10,
          sortBy: 'title',
          direction: 'asc',
        });

        if (cancelled) {
          return;
        }

        const data = response.data;

        if (Array.isArray(data?.content)) {
          const normalized = data.content.map(normalizeBook);
          setBooks(normalized);
          setTotalPages(data.totalPages ?? 0);
          setHasNextPage(
            typeof data.last === 'boolean' ? !data.last : page < (data.totalPages ?? 1) - 1,
          );
          return;
        }

        if (Array.isArray(data)) {
          const normalized = data.map(normalizeBook);
          setBooks(normalized);
          setTotalPages(null);
          setHasNextPage(data.length === 10);
          return;
        }

        setBooks([]);
        setTotalPages(0);
        setHasNextPage(false);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(error);
        setBooks([]);
        setTotalPages(0);
        setHasNextPage(false);

        setMessageType('error');
        setMessage(
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

    fetchBooks();

    return () => {
      cancelled = true;
    };
  }, [page, searchFilters.title, searchFilters.isbn, reloadKey]);

  const handleSearch = (event) => {
    event.preventDefault();

    setLoadingBooks(true);
    setMessage('');
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
    setMessage('');
    setPage(0);

    setSearchFilters({
      title: '',
      isbn: '',
    });
  };

  // Toggle checkbox độc lập cho từng ID sách
  const handleToggleBook = (bookId) => {
    if (bookId === null || bookId === undefined) return;

    setSelectedBookIds((prev) => {
      if (prev.includes(bookId)) {
        return prev.filter((id) => id !== bookId);
      }
      return [...prev, bookId];
    });
  };

  // Gửi yêu cầu mượn sách
  const handleBorrow = async () => {
    console.log('Books:', books);
    console.log('Selected book ids:', selectedBookIds);

    // Validate 1: Danh sách chọn rỗng
    if (selectedBookIds.length === 0) {
      setMessageType('error');
      setMessage('Vui lòng chọn ít nhất một cuốn sách!');
      return;
    }

    // Validate 2: Đảm bảo toàn bộ ID hợp lệ (số nguyên > 0, không null/undefined)
    const validBookIds = selectedBookIds
      .filter((id) => id !== null && id !== undefined && !isNaN(Number(id)) && Number(id) > 0)
      .map((id) => Number(id));

    if (validBookIds.length === 0) {
      setMessageType('error');
      setMessage('Vui lòng chọn ít nhất một cuốn sách!');
      return;
    }

    const payload = {
      bookIds: validBookIds,
    };

    console.log('Borrow payload:', payload);

    try {
      setLoadingBorrow(true);
      setMessage('');

      await borrowBooks(payload);

      setMessageType('success');
      setMessage('Gửi yêu cầu mượn thành công! Vui lòng chờ thư viện xác nhận.');

      // Clear selection sau khi mượn thành công
      setSelectedBookIds([]);
      setReloadKey((current) => current + 1);
    } catch (error) {
      console.error(error);

      const data = error.response?.data;
      setMessageType('error');

      if (typeof data === 'string') {
        setMessage(data);
      } else if (data?.message) {
        setMessage(data.message);
      } else if (data?.error) {
        setMessage(data.error);
      } else if (data && typeof data === 'object') {
        const fieldErrors = Object.entries(data)
          .filter(([key]) => !['timestamp', 'status', 'error', 'path'].includes(key))
          .map(([, value]) => value);

        setMessage(fieldErrors[0] || 'Thông tin mượn sách không hợp lệ!');
      } else {
        setMessage('Không thể gửi yêu cầu mượn sách!');
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
            <div className="borrow-page-pretitle">Library / Borrow Books</div>
            <h1>Mượn sách trực tuyến</h1>
            <p>Chọn các đầu sách bạn muốn mượn từ danh mục thư viện và gửi yêu cầu phê duyệt.</p>
          </div>
        </header>

        {message && (
          <div
            className={`borrow-alert ${
              messageType === 'error' ? 'borrow-alert-error' : 'borrow-alert-success'
            }`}
          >
            <span className="borrow-alert-dot" />
            <span>{message}</span>

            <button type="button" onClick={() => setMessage('')} aria-label="Đóng thông báo">
              ×
            </button>
          </div>
        )}

        {/* Khối xác nhận danh sách sách đã chọn */}
        <section className="borrow-card">
          <div className="borrow-card-header">
            <div>
              <h2>Giỏ sách đã chọn</h2>
              <p>Bạn có thể chọn đồng thời nhiều cuốn sách còn trong kho để mượn cùng lúc.</p>
            </div>

            <div className="borrow-card-badge">{selectedBookIds.length} CUỐN SÁCH</div>
          </div>

          <div className="borrow-info-grid">
            <div className="borrow-selected-box">
              <span>Tài khoản người mượn</span>
              <strong>{user.email || user.username}</strong>
            </div>

            <div className="borrow-selected-box">
              <span>Số lượng sách đã chọn</span>
              <strong style={{ color: '#4f46e5' }}>{selectedBookIds.length} cuốn</strong>
            </div>
          </div>

          <div className="borrow-confirm-row">
            <button
              type="button"
              className="borrow-btn borrow-btn-outline"
              disabled={selectedBookIds.length === 0}
              onClick={() => setSelectedBookIds([])}
            >
              Bỏ chọn tất cả
            </button>

            <button
              type="button"
              className="borrow-btn borrow-btn-primary"
              disabled={loadingBorrow || selectedBookIds.length === 0}
              onClick={handleBorrow}
            >
              {loadingBorrow ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu mượn'}
            </button>
          </div>
        </section>

        {/* Khối tra cứu & danh sách sách */}
        <section className="borrow-card">
          <div className="borrow-card-header">
            <div>
              <h2>Tra cứu & chọn sách</h2>
              <p>Đánh dấu vào ô vuông để chọn sách cần mượn (sách hết kho sẽ bị khóa chọn).</p>
            </div>

            <div className="borrow-page-count">
              {totalPages === null
                ? `Trang ${page + 1}`
                : `Trang ${totalPages === 0 ? 0 : page + 1} / ${totalPages}`}
            </div>
          </div>

          <form className="borrow-search-form" onSubmit={handleSearch}>
            <div className="borrow-field">
              <label>Tên sách</label>

              <input
                type="text"
                placeholder="Ví dụ: Clean Code"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div className="borrow-field">
              <label>Mã ISBN</label>

              <input
                type="text"
                placeholder="Nhập ISBN..."
                value={isbn}
                onChange={(event) => setIsbn(event.target.value)}
              />
            </div>

            <div className="borrow-search-actions">
              <button
                type="button"
                className="borrow-btn borrow-btn-outline"
                onClick={handleResetSearch}
              >
                Đặt lại
              </button>

              <button type="submit" className="borrow-btn borrow-btn-primary">
                Tìm kiếm
              </button>
            </div>
          </form>

          <div className="borrow-book-list">
            {loadingBooks ? (
              <div className="borrow-loading">Đang tải danh sách sách...</div>
            ) : books.length === 0 ? (
              <div className="borrow-empty">Không tìm thấy sách nào phù hợp với bộ lọc.</div>
            ) : (
              <div className="borrow-table-wrapper">
                <table className="borrow-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px', textAlign: 'center' }}>Chọn</th>
                      <th>ID</th>
                      <th>Tên sách</th>
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
                            />
                          </td>

                          <td className="borrow-mono">#{book.id}</td>
                          <td className="borrow-book-name">{book.title}</td>
                          <td className="borrow-mono">{book.isbn}</td>
                          <td>{book.quantity}</td>

                          <td>
                            <span
                              className={`borrow-book-status ${
                                available ? 'available' : 'unavailable'
                              }`}
                            >
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
            <span>
              Đã chọn <strong>{selectedBookIds.length}</strong> cuốn sách
            </span>

            <div className="borrow-pagination">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => {
                  setLoadingBooks(true);
                  setPage((current) => current - 1);
                }}
              >
                ‹
              </button>

              <span>{page + 1}</span>

              <button
                type="button"
                disabled={
                  totalPages === null ? !hasNextPage : totalPages === 0 || page >= totalPages - 1
                }
                onClick={() => {
                  setLoadingBooks(true);
                  setPage((current) => current + 1);
                }}
              >
                ›
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default BorrowBook;
