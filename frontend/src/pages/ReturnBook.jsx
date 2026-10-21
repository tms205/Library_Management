import { useEffect, useState } from 'react';
import { getMyBorrowedBooks, requestReturn } from '../api/borrowApi';
import { hasPermission } from '../utils/auth';
import StatusBadge from '../components/StatusBadge';

import '../styles/return.css';

function ReturnBook() {
  const canReturn = hasPermission('RETURN_BOOK');

  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const loadBorrowedBooks = async () => {
    try {
      setLoading(true);
      const response = await getMyBorrowedBooks();
      setBorrowedBooks(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setBorrowedBooks([]);
      setMessageType('error');
      setMessage(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Không thể tải danh sách sách của bạn!',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBorrowedBooks();
  }, []);

  const handleRequestReturn = async (borrowRecordId) => {
    try {
      setActionLoadingId(borrowRecordId);
      setMessage('');
      await requestReturn(borrowRecordId);
      setMessageType('success');
      setMessage('Gửi yêu cầu trả sách thành công! Vui lòng chờ thủ thư thư viện xác nhận.');
      await loadBorrowedBooks();
    } catch (error) {
      console.error(error);
      setMessageType('error');
      setMessage(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Không thể gửi yêu cầu trả sách!',
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="return-page">
      <div className="return-page-wrapper">
        <header className="return-page-header">
          <div>
            <div className="return-page-pretitle">Library / My Books</div>
            <h1>Sách của tôi</h1>
            <p>Theo dõi tiến trình phê duyệt, sách đang mượn và gửi yêu cầu hoàn trả sách.</p>
          </div>
        </header>

        {message && (
          <div
            className={`return-alert ${
              messageType === 'error' ? 'return-alert-error' : 'return-alert-success'
            }`}
          >
            <span className="return-alert-dot" />
            <span>{message}</span>
            <button type="button" onClick={() => setMessage('')} aria-label="Đóng thông báo">
              ×
            </button>
          </div>
        )}

        <section className="return-card">
          <div className="return-card-header">
            <div>
              <h2>Lịch sử mượn & trả sách</h2>
              <p>Danh sách toàn bộ các yêu cầu mượn sách liên kết với tài khoản của bạn.</p>
            </div>

            <div className="return-card-badge">{borrowedBooks.length} BẢN GHI</div>
          </div>

          <div className="return-toolbar">
            <button
              type="button"
              className="return-btn return-btn-outline"
              disabled={loading}
              onClick={loadBorrowedBooks}
            >
              <span>↻</span> Tải lại danh sách
            </button>
          </div>

          {loading ? (
            <div className="return-empty">
              <span className="gt-spinner" style={{ marginRight: '8px' }} />
              Đang tải danh sách sách mượn...
            </div>
          ) : borrowedBooks.length === 0 ? (
            <div className="return-empty" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
              <strong style={{ display: 'block', fontSize: '16px', color: '#1e293b', marginBottom: '6px' }}>
                Bạn chưa có yêu cầu mượn sách nào
              </strong>
              <span style={{ fontSize: '14px', color: '#64748b' }}>
                Hãy vào mục <strong>Mượn sách</strong> để chọn các cuốn sách yêu thích từ thư viện.
              </span>
            </div>
          ) : (
            <div className="return-table-wrapper">
              <table className="return-table">
                <thead>
                  <tr>
                    <th>Mã phiếu</th>
                    <th>Book ID</th>
                    <th>Tên sách</th>
                    <th>Ngày mượn</th>
                    <th>Ngày trả</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {borrowedBooks.map((item) => (
                    <tr key={item.id}>
                      <td className="return-mono">#{item.id}</td>
                      <td className="return-mono">#{item.bookId}</td>
                      <td className="return-book-name">{item.bookTitle}</td>
                      <td>{item.borrowDate || '—'}</td>
                      <td>{item.returnDate || '—'}</td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {/* Chỉ hiện nút Yêu cầu trả khi sách đang ở trạng thái BORROWED và user có quyền RETURN_BOOK */}
                        {item.status === 'BORROWED' && canReturn ? (
                          <button
                            type="button"
                            className="return-btn return-btn-primary"
                            style={{ padding: '6px 14px', fontSize: '13px' }}
                            disabled={actionLoadingId === item.id}
                            onClick={() => handleRequestReturn(item.id)}
                          >
                            {actionLoadingId === item.id ? 'Đang gửi...' : 'Yêu cầu trả'}
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default ReturnBook;
