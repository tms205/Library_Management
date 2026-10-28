import { useEffect, useState } from 'react';
import {
  getBorrowManagement,
  approveBorrow,
  rejectBorrow,
  confirmReturn,
} from '../api/borrowApi';
import { hasPermission } from '../utils/auth';
import StatusBadge from '../components/StatusBadge';

import '../styles/borrowManagement.css';

function BorrowManagement() {
  const canApprove = hasPermission('BORROW_APPROVE');
  const canConfirmReturn = hasPermission('RETURN_CONFIRM');

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  // =========================================================================
  // STATE BỘ LỌC TÌM KIẾM PHIẾU MƯỢN TRẢ
  // - Ô nhập tạm thời (thay đổi khi gõ hoặc chọn ngày)
  // - appliedFilters: chỉ cập nhật khi nhấn nút "Tìm kiếm" hoặc "Đặt lại"
  // =========================================================================
  const [filterMemberName, setFilterMemberName] = useState('');
  const [filterBookTitle, setFilterBookTitle] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [appliedFilters, setAppliedFilters] = useState({
    memberName: '',
    bookTitle: '',
    fromDate: '',
    toDate: '',
    status: 'ALL',
  });

  const hasActiveFilters = Boolean(
    appliedFilters.memberName ||
    appliedFilters.bookTitle ||
    appliedFilters.fromDate ||
    appliedFilters.toDate ||
    appliedFilters.status !== 'ALL',
  );

  const buildQueryParams = (filters) => {
    const params = {};
    if (filters.memberName?.trim()) params.memberName = filters.memberName.trim();
    if (filters.bookTitle?.trim()) params.bookTitle = filters.bookTitle.trim();
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
    if (filters.status && filters.status !== 'ALL') params.status = filters.status;
    return params;
  };

  const loadRecords = async (filters = appliedFilters) => {
    try {
      setLoading(true);
      const queryParams = buildQueryParams(filters);
      const response = await getBorrowManagement(queryParams);
      setRecords(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setRecords([]);
      setMessageType('error');
      setMessage(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Không thể tải danh sách quản lý mượn trả!',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault();
    const nextFilters = {
      memberName: filterMemberName,
      bookTitle: filterBookTitle,
      fromDate: filterFromDate,
      toDate: filterToDate,
      status: filterStatus,
    };
    setAppliedFilters(nextFilters);
    loadRecords(nextFilters);
  };

  const handleReset = () => {
    setFilterMemberName('');
    setFilterBookTitle('');
    setFilterFromDate('');
    setFilterToDate('');
    setFilterStatus('ALL');

    const defaultFilters = {
      memberName: '',
      bookTitle: '',
      fromDate: '',
      toDate: '',
      status: 'ALL',
    };
    setAppliedFilters(defaultFilters);
    loadRecords(defaultFilters);
  };

  const handleApprove = async (id) => {
    try {
      setActionLoadingId(id);
      setMessage('');
      await approveBorrow(id);
      setMessageType('success');
      setMessage(`Duyệt yêu cầu mượn #${id} thành công! Kho sách đã được tự động trừ 1 cuốn.`);
      await loadRecords();
    } catch (error) {
      console.error(error);
      setMessageType('error');
      setMessage(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Không thể duyệt yêu cầu mượn!',
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id) => {
    try {
      setActionLoadingId(id);
      setMessage('');
      await rejectBorrow(id);
      setMessageType('success');
      setMessage(`Từ chối yêu cầu mượn #${id} thành công!`);
      await loadRecords();
    } catch (error) {
      console.error(error);
      setMessageType('error');
      setMessage(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Không thể từ chối yêu cầu mượn!',
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReturn = async (id) => {
    try {
      setActionLoadingId(id);
      setMessage('');
      await confirmReturn(id);
      setMessageType('success');
      setMessage(`Xác nhận nhận lại sách cho phiếu #${id} thành công! Kho sách đã được cộng lại 1 cuốn.`);
      await loadRecords();
    } catch (error) {
      console.error(error);
      setMessageType('error');
      setMessage(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Không thể xác nhận trả sách!',
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="bm-page">
      <div className="bm-page-wrapper">
        <header className="bm-page-header">
          <div>
            <div className="bm-page-pretitle">Management / Borrow & Return Workflow</div>
            <h1>Quản lý mượn & trả sách</h1>
            <p>Xét duyệt yêu cầu mượn, từ chối phiếu mượn hoặc xác nhận thu hồi sách từ độc giả.</p>
          </div>
        </header>

        {message && (
          <div
            className={`bm-alert ${
              messageType === 'error' ? 'bm-alert-error' : 'bm-alert-success'
            }`}
          >
            <span className="bm-alert-dot" />
            <span>{message}</span>
            <button type="button" onClick={() => setMessage('')} aria-label="Đóng thông báo">
              ×
            </button>
          </div>
        )}

        {/* KHỐI BỘ LỌC TÌM KIẾM PHIẾU MƯỢN TRẢ */}
        <section className="bm-search-card">
          <div className="bm-search-header">
            <div className="bm-search-title">
              <span>🔍</span>
              <span>Bộ lọc & Tìm kiếm phiếu mượn</span>
            </div>
            {hasActiveFilters && (
              <span className="bm-filter-active-pill">Đang áp dụng bộ lọc</span>
            )}
          </div>

          <form onSubmit={handleSearch} className="bm-search-form">
            <div className="bm-search-grid">
              <div className="bm-form-group">
                <label htmlFor="filter-member">Tên độc giả</label>
                <input
                  id="filter-member"
                  type="text"
                  placeholder="Nhập tên độc giả..."
                  value={filterMemberName}
                  onChange={(e) => setFilterMemberName(e.target.value)}
                />
              </div>

              <div className="bm-form-group">
                <label htmlFor="filter-book">Tên sách</label>
                <input
                  id="filter-book"
                  type="text"
                  placeholder="Nhập tên sách..."
                  value={filterBookTitle}
                  onChange={(e) => setFilterBookTitle(e.target.value)}
                />
              </div>

              <div className="bm-form-group">
                <label htmlFor="filter-from-date">Từ ngày</label>
                <input
                  id="filter-from-date"
                  type="date"
                  value={filterFromDate}
                  onChange={(e) => setFilterFromDate(e.target.value)}
                />
              </div>

              <div className="bm-form-group">
                <label htmlFor="filter-to-date">Đến ngày</label>
                <input
                  id="filter-to-date"
                  type="date"
                  value={filterToDate}
                  onChange={(e) => setFilterToDate(e.target.value)}
                />
              </div>

              <div className="bm-form-group">
                <label htmlFor="filter-status">Trạng thái phiếu</label>
                <select
                  id="filter-status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="PENDING">Chờ duyệt mượn (PENDING)</option>
                  <option value="BORROWED">Đang mượn (BORROWED)</option>
                  <option value="RETURN_PENDING">Chờ xác nhận trả (RETURN_PENDING)</option>
                  <option value="RETURNED">Đã hoàn trả (RETURNED)</option>
                  <option value="REJECTED">Đã từ chối (REJECTED)</option>
                </select>
              </div>
            </div>

            <div className="bm-search-actions">
              <button
                type="button"
                className="bm-btn bm-btn-outline"
                onClick={handleReset}
                disabled={loading}
              >
                ↺ Đặt lại
              </button>
              <button
                type="submit"
                className="bm-btn bm-btn-primary"
                disabled={loading}
              >
                🔍 Tìm kiếm
              </button>
            </div>
          </form>
        </section>

        <section className="bm-card">
          <div className="bm-card-header">
            <div>
              <h2>Danh sách yêu cầu luân chuyển sách</h2>
              <p>Lịch sử toàn diện các giao dịch mượn và trả sách trong hệ thống.</p>
            </div>

            <div className="bm-card-badge">{records.length} BẢN GHI</div>
          </div>

          <div className="bm-toolbar">
            <div className="bm-toolbar-summary">
              {hasActiveFilters ? (
                <span className="bm-summary-text">
                  Tìm thấy <strong>{records.length}</strong> kết quả khớp bộ lọc
                </span>
              ) : (
                <span className="bm-summary-text">
                  Hiển thị <strong>{records.length}</strong> phiếu mượn
                </span>
              )}
            </div>

            <button
              type="button"
              className="bm-btn bm-btn-outline"
              disabled={loading}
              onClick={() => loadRecords(appliedFilters)}
            >
              <span>↻</span> Tải lại dữ liệu
            </button>
          </div>

          {loading ? (
            <div className="bm-empty">
              <span className="gt-spinner" style={{ marginRight: '8px' }} />
              Đang tải danh sách mượn trả...
            </div>
          ) : records.length === 0 ? (
            <div className="bm-empty" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
              <strong style={{ display: 'block', fontSize: '16px', color: '#1e293b', marginBottom: '6px' }}>
                Hiện chưa có bản ghi mượn trả nào
              </strong>
              <span style={{ fontSize: '14px', color: '#64748b' }}>
                Khi bạn đọc gửi yêu cầu mượn sách, các phiếu sẽ hiển thị tại đây để bạn phê duyệt.
              </span>
            </div>
          ) : (
            <div className="bm-table-wrapper">
              <table className="bm-table">
                <thead>
                  <tr>
                    <th>Mã phiếu</th>
                    <th>Mã độc giả</th>
                    <th>Tên độc giả</th>
                    <th>Mã sách</th>
                    <th>Tên sách</th>
                    <th>Ngày mượn</th>
                    <th>Ngày trả</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'center' }}>Thao tác xét duyệt</th>
                  </tr>
                </thead>

                <tbody>
                  {records.map((item) => {
                    const isBusy = actionLoadingId === item.id;

                    return (
                      <tr key={item.id}>
                        <td className="bm-mono">#{item.id}</td>
                        <td className="bm-mono">#{item.memberId}</td>
                        <td className="bm-member-name">{item.memberName}</td>
                        <td className="bm-mono">#{item.bookId}</td>
                        <td className="bm-book-name">{item.bookTitle}</td>
                        <td>{item.borrowDate || '—'}</td>
                        <td>{item.returnDate || '—'}</td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {/* BORROW_APPROVE: Hiện nút Duyệt / Từ chối cho yêu cầu PENDING */}
                          {item.status === 'PENDING' && canApprove && (
                            <div className="bm-action-group" style={{ justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="bm-btn bm-btn-approve"
                                disabled={isBusy}
                                onClick={() => handleApprove(item.id)}
                              >
                                {isBusy ? '...' : 'Duyệt'}
                              </button>
                              <button
                                type="button"
                                className="bm-btn bm-btn-reject"
                                disabled={isBusy}
                                onClick={() => handleReject(item.id)}
                              >
                                {isBusy ? '...' : 'Từ chối'}
                              </button>
                            </div>
                          )}

                          {/* RETURN_CONFIRM: Hiện nút Xác nhận trả cho yêu cầu RETURN_PENDING */}
                          {item.status === 'RETURN_PENDING' && canConfirmReturn && (
                            <div className="bm-action-group" style={{ justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="bm-btn bm-btn-confirm"
                                disabled={isBusy}
                                onClick={() => handleConfirmReturn(item.id)}
                              >
                                {isBusy ? '...' : 'Xác nhận trả'}
                              </button>
                            </div>
                          )}

                          {/* Trạng thái không có thao tác hoặc thiếu quyền */}
                          {item.status !== 'PENDING' && item.status !== 'RETURN_PENDING' && (
                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
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
    </div>
  );
}

export default BorrowManagement;
