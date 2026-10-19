import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import { borrowBooks } from '../api/borrowApi';

import { searchBooks } from '../api/bookApi';

import '../styles/borrow.css';

function BorrowBook() {
  const [books, setBooks] = useState([]);

  const [selectedBooks, setSelectedBooks] = useState([]);

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

  const [message, setMessage] = useState('');

  const [messageType, setMessageType] = useState('success');

  const getBookId = (book) => {
    return book.id ?? book.idLong;
  };

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
          setBooks(data.content);

          setTotalPages(data.totalPages ?? 0);

          setHasNextPage(
            typeof data.last === 'boolean' ? !data.last : page < (data.totalPages ?? 1) - 1,
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
  }, [page, searchFilters.title, searchFilters.isbn]);

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

  const isSelected = (book) => {
    const bookId = getBookId(book);

    return selectedBooks.some((selectedBook) => getBookId(selectedBook) === bookId);
  };

  const toggleBook = (book) => {
    if (Number(book.quantity) <= 0) {
      return;
    }

    const bookId = getBookId(book);

    setSelectedBooks((currentBooks) => {
      const exists = currentBooks.some((selectedBook) => getBookId(selectedBook) === bookId);

      if (exists) {
        return currentBooks.filter((selectedBook) => getBookId(selectedBook) !== bookId);
      }

      return [...currentBooks, book];
    });
  };

  const handleBorrow = async () => {
    if (selectedBooks.length === 0) {
      setMessageType('error');

      setMessage('Vui lòng chọn ít nhất 1 cuốn sách!');

      return;
    }

    try {
      setLoadingBorrow(true);

      setMessage('');

      const requestData = {
        bookIds: selectedBooks.map((book) => Number(getBookId(book))),
      };

      const response = await borrowBooks(requestData);

      setMessageType('success');

      setMessage(response.data?.message || `Mượn thành công ${selectedBooks.length} sách!`);

      // Cap nhat quantity tren giao dien
      const selectedIds = selectedBooks.map((book) => getBookId(book));

      setBooks((currentBooks) =>
        currentBooks.map((book) => {
          if (selectedIds.includes(getBookId(book))) {
            return {
              ...book,

              quantity: Math.max(0, Number(book.quantity) - 1),
            };
          }

          return book;
        }),
      );

      setSelectedBooks([]);
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
        setMessage('Không thể mượn sách!');
      }
    } finally {
      setLoadingBorrow(false);
    }
  };

  return (
    <main className="borrow-page">
      <div className="borrow-page-wrapper">
        <header className="borrow-page-header">
          <div>
            <div className="borrow-page-pretitle">Library / Borrow</div>

            <h1>Mượn sách</h1>

            <p>Chọn các sách bạn muốn mượn. Hệ thống tự xác định tài khoản đang đăng nhập.</p>
          </div>

          <Link to="/dashboard" className="borrow-btn borrow-btn-home">
            ← Trang chủ
          </Link>
        </header>

        {message && (
          <div
            className={`borrow-alert ${
              messageType === 'error' ? 'borrow-alert-error' : 'borrow-alert-success'
            }`}
          >
            <span className="borrow-alert-dot" />

            <span>{message}</span>

            <button type="button" onClick={() => setMessage('')}>
              ×
            </button>
          </div>
        )}

        <section className="borrow-card">
          <div className="borrow-card-header">
            <div>
              <h2>Sách đã chọn</h2>

              <p>Bạn có thể chọn nhiều sách trong cùng một lần mượn.</p>
            </div>

            <div className="borrow-card-badge">{selectedBooks.length} BOOK</div>
          </div>

          <div className="borrow-info-grid">
            <div className="borrow-selected-box">
              <span>Tài khoản</span>

              <strong>Member đang đăng nhập</strong>
            </div>

            <div className="borrow-selected-box">
              <span>Số sách đã chọn</span>

              <strong>{selectedBooks.length}</strong>
            </div>
          </div>

          <div className="borrow-confirm-row">
            <button
              type="button"
              className="borrow-btn borrow-btn-outline"
              disabled={selectedBooks.length === 0}
              onClick={() => setSelectedBooks([])}
            >
              Bỏ chọn tất cả
            </button>

            <button
              type="button"
              className="borrow-btn borrow-btn-primary"
              disabled={loadingBorrow || selectedBooks.length === 0}
              onClick={handleBorrow}
            >
              {loadingBorrow ? 'Đang xử lý...' : `Mượn ${selectedBooks.length} sách`}
            </button>
          </div>
        </section>

        <section className="borrow-card">
          <div className="borrow-card-header">
            <div>
              <h2>Danh sách sách</h2>

              <p>Tick vào các sách cần mượn.</p>
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
              <label>ISBN</label>

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
              <div className="borrow-empty">Không tìm thấy sách.</div>
            ) : (
              <div className="borrow-table-wrapper">
                <table className="borrow-table">
                  <thead>
                    <tr>
                      <th>Chọn</th>
                      <th>ID</th>
                      <th>Tên sách</th>
                      <th>ISBN</th>
                      <th>Số lượng</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>

                  <tbody>
                    {books.map((book) => {
                      const bookId = getBookId(book);

                      const selected = isSelected(book);

                      const available = Number(book.quantity) > 0;

                      return (
                        <tr key={bookId} className={selected ? 'borrow-row-selected' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={!available}
                              onChange={() => toggleBook(book)}
                            />
                          </td>

                          <td className="borrow-mono">#{bookId}</td>

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
              Đã chọn <strong>{selectedBooks.length}</strong> sách
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
    </main>
  );
}

export default BorrowBook;
