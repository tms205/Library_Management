import ErrorState from '../components/ErrorState';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyBorrowedBooks, requestReturn } from '../api/borrowApi';
import { hasPermission } from '../utils/auth';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import {
  RotateCw,
  Clock,
  CheckCircle2,
  BookMarked,
  ArrowRight,
} from 'lucide-react';

import '../styles/return.css';

function ReturnBook() {
  const navigate = useNavigate();
  const canReturn = hasPermission('RETURN_BOOK');
  const toast = useToast();

  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const requestVersion = useRef(0);
  const mounted = useRef(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Modal xác nhận yêu cầu trả sách
  const [recordToReturn, setRecordToReturn] = useState(null);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  const loadBorrowedBooks = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      setLoading(true);
      setLoadError('');
      const response = await getMyBorrowedBooks();
      if (!mounted.current || version !== requestVersion.current) return;
      setBorrowedBooks(Array.isArray(response.data) ? response.data : []);
    } catch (error) {

      if (!mounted.current || version !== requestVersion.current) return;
      setLoadError(error.response?.data?.message || 'Không thể tải tủ sách của bạn.');
      setBorrowedBooks([]);
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Không thể tải danh sách sách mượn của bạn!',
      );
    } finally {
      if (mounted.current && version === requestVersion.current) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    Promise.resolve().then(() => { if (active) loadBorrowedBooks(); });
    return () => { active = false; mounted.current = false; };
  }, [loadBorrowedBooks]);

  const confirmReturnRequest = async () => {
    if (!recordToReturn || isSubmittingReturn) return;
    try {
      setIsSubmittingReturn(true);
      setActionLoadingId(recordToReturn.id);
      await requestReturn(recordToReturn.id);
      toast.success(
        `Đã gửi yêu cầu hoàn trả cuốn sách "${recordToReturn.bookTitle}". Vui lòng mang sách tới quầy để thủ thư kiểm tra.`,
        'Yêu cầu hoàn trả',
      );
      setRecordToReturn(null);
      await loadBorrowedBooks();
    } catch (error) {

      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Không thể gửi yêu cầu trả sách!',
      );
    } finally {
      setIsSubmittingReturn(false);
      setActionLoadingId(null);
    }
  };

  const activeBorrowedCount = borrowedBooks.filter((r) => r.status === 'BORROWED').length;
  const overdueCount = borrowedBooks.filter((r) => r.isOverdue && ['BORROWED', 'RETURN_PENDING'].includes(r.status)).length;

  return (
    <div className="return-page">
      <div className="return-page-wrapper">
        <header className="return-page-header">
          <div>
            <div className="return-page-pretitle">KHÔNG GIAN ĐỌC CỦA BẠN</div>
            <h1>Tủ sách của tôi</h1>
            <p>Theo dõi thời hạn mượn và gửi yêu cầu trả sách tới quầy thủ thư trực tuyến.</p>
          </div>

          <div className="return-metrics-pills">
            <div className="metric-pill">
              <span className="pill-dot blue" />
              <span>Đang mượn: <strong>{activeBorrowedCount}</strong> cuốn</span>
            </div>

            {overdueCount > 0 && (
              <div className="metric-pill overdue">
                <span className="pill-dot red" />
                <span>Quá hạn: <strong>{overdueCount}</strong> cuốn</span>
              </div>
            )}
          </div>
        </header>

        <section className="return-card">
          <div className="return-card-header">
            <div>
              <h2>Lịch sử mượn & trả sách</h2>
              <p>Danh sách toàn bộ các yêu cầu mượn sách liên kết với tài khoản độc giả của bạn.</p>
            </div>

            <div className="return-card-badge">{borrowedBooks.length} BẢN GHI</div>
          </div>

          <div className="return-toolbar">
            <button
              type="button"
              className="btn btn-outline"
              disabled={loading}
              onClick={loadBorrowedBooks}
              style={{ fontSize: '13px', height: '36px' }}
            >
              <RotateCw size={15} className={loading ? 'spinner' : ''} />
              <span>Tải lại danh sách</span>
            </button>
          </div>

          {loading ? (
            <SkeletonTable rows={5} cols={8} />
          ) : loadError ? (<ErrorState message={loadError} onRetry={loadBorrowedBooks} />) : borrowedBooks.length === 0 ? (
            <EmptyState
              icon={BookMarked}
              title="Tủ sách của bạn đang trống"
              description="Bạn chưa đăng ký mượn cuốn sách nào từ thư viện Aura. Hãy khám phá danh mục các đầu sách và mượn cuốn sách yêu thích ngay hôm nay!"
              actionLabel="Khám phá kho sách"
              onAction={() => navigate('/books')}
            />
          ) : (
            <div className="return-table-wrapper">
              <table className="return-table">
                <thead>
                  <tr>
                    <th>Mã phiếu</th>
                    <th>Book ID</th>
                    <th>Tên sách</th>
                    <th>Ngày mượn</th>
                    <th>Hạn trả</th>
                    <th>Ngày trả</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {borrowedBooks.map((item) => {
                    const isCurrentlyOverdue = item.isOverdue && ['BORROWED', 'RETURN_PENDING'].includes(item.status);

                    return (
                      <tr
                        key={item.id}
                        className={isCurrentlyOverdue ? 'return-row-overdue' : ''}
                      >
                        <td className="return-mono">#{item.id}</td>
                        <td className="return-mono">#{item.bookId}</td>
                        <td className="return-book-name">{item.bookTitle}</td>
                        <td>{item.borrowDate || '—'}</td>
                        <td>
                          <div style={{ fontWeight: item.dueDate ? 600 : 400 }}>
                            {item.dueDate || '—'}
                          </div>
                          {isCurrentlyOverdue && (
                            <span className="return-overdue-tag">
                              <Clock size={12} /> Quá hạn ({item.overdueDays} ngày)
                            </span>
                          )}
                          {!item.isOverdue && ['BORROWED', 'RETURN_PENDING'].includes(item.status) && item.dueDate && (
                            <span className="return-valid-tag">
                              <CheckCircle2 size={12} /> Còn hạn
                            </span>
                          )}
                        </td>
                        <td>{item.returnDate || '—'}</td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {item.status === 'BORROWED' && canReturn ? (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ height: '32px', padding: '0 12px', fontSize: '12.5px' }}
                              disabled={actionLoadingId === item.id}
                              onClick={() => setRecordToReturn(item)}
                            >
                              {actionLoadingId === item.id ? (
                                <>
                                  <span className="spinner" />
                                  <span>Đang gửi...</span>
                                </>
                              ) : (
                                <>
                                  <span>Yêu cầu trả sách</span>
                                  <ArrowRight size={13} />
                                </>
                              )}
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Accessible Return Book Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(recordToReturn)}
        variant="info"
        title="Xác nhận gửi yêu cầu hoàn trả sách"
        message="Hệ thống sẽ chuyển trạng thái phiếu mượn sang 'Chờ xác nhận trả' (RETURN_PENDING). Vui lòng mang sách nguyên vẹn tới quầy thư viện để thủ thư xác nhận hoàn tất."
        highlightText={recordToReturn ? `"${recordToReturn.bookTitle}" (Phiếu mượn: #${recordToReturn.id})` : ''}
        confirmText="Xác nhận trả sách"
        cancelText="Hủy bỏ"
        isLoading={isSubmittingReturn}
        onConfirm={confirmReturnRequest}
        onCancel={() => setRecordToReturn(null)}
      />
    </div>
  );
}

export default ReturnBook;
