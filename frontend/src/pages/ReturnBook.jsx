import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import { getMyBorrowedBooks, returnBook } from '../api/borrowApi';

import '../styles/return.css';

function ReturnBook() {
  const [borrowedBooks, setBorrowedBooks] = useState([]);

  const [selectedIds, setSelectedIds] = useState([]);

  const [loading, setLoading] = useState(true);

  const [loadingReturn, setLoadingReturn] = useState(false);

  const [message, setMessage] = useState('');

  const [messageType, setMessageType] = useState('success');

  // =========================
  // LOAD SACH CUA TOI
  // =========================

  useEffect(() => {
    let cancelled = false;

    const loadBorrowedBooks = async () => {
      try {
        const response = await getMyBorrowedBooks();

        if (cancelled) {
          return;
        }

        setBorrowedBooks(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(error);

        setBorrowedBooks([]);

        setMessageType('error');

        setMessage(
          error.response?.data?.message ||
            error.response?.data?.error ||
            'Không thể tải danh sách sách đang mượn!',
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadBorrowedBooks();

    return () => {
      cancelled = true;
    };
  }, []);

  // =========================
  // CHON SACH
  // =========================

  const toggleBorrowRecord = (borrowRecordId) => {
    setSelectedIds((current) => {
      if (current.includes(borrowRecordId)) {
        return current.filter((id) => id !== borrowRecordId);
      }

      return [...current, borrowRecordId];
    });
  };

  // =========================
  // LOAD LAI
  // =========================

  const reloadBooks = async () => {
    const response = await getMyBorrowedBooks();

    setBorrowedBooks(Array.isArray(response.data) ? response.data : []);
  };

  // =========================
  // TRA NHIEU SACH
  // =========================

  const handleReturn = async () => {
    if (selectedIds.length === 0) {
      setMessageType('error');

      setMessage('Vui lòng chọn ít nhất 1 cuốn sách cần trả!');

      return;
    }

    try {
      setLoadingReturn(true);

      setMessage('');

      const results = await Promise.allSettled(
        selectedIds.map((borrowRecordId) => returnBook(borrowRecordId)),
      );

      const successCount = results.filter((result) => result.status === 'fulfilled').length;

      const failedCount = results.length - successCount;

      if (failedCount === 0) {
        setMessageType('success');

        setMessage(`Trả thành công ${successCount} cuốn sách!`);
      } else {
        setMessageType('error');

        setMessage(`Đã trả ${successCount} sách, ${failedCount} sách thất bại.`);
      }

      setSelectedIds([]);

      await reloadBooks();
    } catch (error) {
      console.error(error);

      setMessageType('error');

      setMessage(
        error.response?.data?.message || error.response?.data?.error || 'Không thể trả sách!',
      );
    } finally {
      setLoadingReturn(false);
    }
  };

  return (
    <main className="return-page">
      <div className="return-page-wrapper">
        <header className="return-page-header">
          <div>
            <div className="return-page-pretitle">Library / Return</div>

            <h1>Trả sách</h1>

            <p>Danh sách sách đang mượn của tài khoản hiện tại.</p>
          </div>

          <Link to="/dashboard" className="return-btn return-btn-home">
            ← Trang chủ
          </Link>
        </header>

        {message && (
          <div
            className={`return-alert ${
              messageType === 'error' ? 'return-alert-error' : 'return-alert-success'
            }`}
          >
            <span className="return-alert-dot" />

            <span>{message}</span>

            <button type="button" onClick={() => setMessage('')}>
              ×
            </button>
          </div>
        )}

        <section className="return-card">
          <div className="return-card-header">
            <div>
              <h2>Sách đang mượn</h2>

              <p>Hệ thống tự lấy member từ tài khoản đang đăng nhập.</p>
            </div>

            <div className="return-card-badge">{borrowedBooks.length} BORROWED</div>
          </div>

          <div className="return-toolbar">
            <button
              type="button"
              className="return-btn return-btn-outline"
              disabled={borrowedBooks.length === 0}
              onClick={() => setSelectedIds(borrowedBooks.map((item) => item.id))}
            >
              Chọn tất cả
            </button>

            <button
              type="button"
              className="return-btn return-btn-outline"
              disabled={selectedIds.length === 0}
              onClick={() => setSelectedIds([])}
            >
              Bỏ chọn tất cả
            </button>

            <button type="button" className="return-btn return-btn-outline" onClick={reloadBooks}>
              Tải lại
            </button>
          </div>

          {loading ? (
            <div className="return-empty">Đang tải dữ liệu...</div>
          ) : borrowedBooks.length === 0 ? (
            <div className="return-empty">Bạn hiện không có sách đang mượn.</div>
          ) : (
            <div className="return-table-wrapper">
              <table className="return-table">
                <thead>
                  <tr>
                    <th>Chọn</th>
                    <th>Borrow ID</th>
                    <th>Book ID</th>
                    <th>Tên sách</th>
                    <th>Ngày mượn</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>

                <tbody>
                  {borrowedBooks.map((item) => {
                    const selected = selectedIds.includes(item.id);

                    return (
                      <tr key={item.id} className={selected ? 'return-row-selected' : ''}>
                        <td>
                          <input
                            className="return-checkbox"
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleBorrowRecord(item.id)}
                          />
                        </td>

                        <td className="return-mono">#{item.id}</td>

                        <td className="return-mono">#{item.bookId}</td>

                        <td className="return-book-name">{item.bookTitle}</td>

                        <td>{item.borrowDate || '—'}</td>

                        <td>
                          <span className="return-status">Đang mượn</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="return-card-footer">
            <span>
              Đã chọn <strong>{selectedIds.length}</strong> sách
            </span>

            <button
              type="button"
              className="return-btn return-btn-primary"
              disabled={selectedIds.length === 0 || loadingReturn}
              onClick={handleReturn}
            >
              {loadingReturn ? 'Đang trả sách...' : `Trả ${selectedIds.length} sách`}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ReturnBook;
