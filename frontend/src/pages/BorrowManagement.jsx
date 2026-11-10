import { useSearchParams } from 'react-router-dom';
import ErrorState from '../components/ErrorState';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  getBorrowManagement,
  approveBorrow,
  rejectBorrow,
  confirmReturn,
} from '../api/borrowApi';
import { hasPermission } from '../utils/auth';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { SkeletonTable } from '../components/Skeleton';
import {
  Filter,
  Search,
  RotateCcw,
  Check,
  X,
  CheckCircle2,
  Clock,
  Inbox,
  AlertTriangle,
} from 'lucide-react';

import '../styles/borrowManagement.css';

function BorrowManagement() {
  const [params] = useSearchParams();
  const urlStatus = ['PENDING','BORROWED','RETURN_PENDING','RETURNED','REJECTED'].includes(params.get('status')) ? params.get('status') : 'ALL';
  const requestVersion = useRef(0);
  const mounted = useRef(false);
  const [loadError, setLoadError] = useState('');
  const canApprove = hasPermission('BORROW_APPROVE');
  const canConfirmReturn = hasPermission('RETURN_CONFIRM');
  const toast = useToast();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Modal từ chối mượn
  const [itemToReject, setItemToReject] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);

  // Phân trang danh sách
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Bộ lọc tìm kiếm
  const [filterMemberName, setFilterMemberName] = useState('');
  const [filterBookTitle, setFilterBookTitle] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterStatus, setFilterStatus] = useState(urlStatus);
  const [onlyOverdue, setOnlyOverdue] = useState(params.get('overdue') === 'true');

  const [appliedFilters, setAppliedFilters] = useState({
    memberName: '',
    bookTitle: '',
    fromDate: '',
    toDate: '',
    status: urlStatus,
  });

  const loadRecords = useCallback(async (filters = {}) => {
    const version = ++requestVersion.current;
    try {
      setLoading(true);
      setLoadError('');
      const params = {};
      if (filters.memberName?.trim()) params.memberName = filters.memberName.trim();
      if (filters.bookTitle?.trim()) params.bookTitle = filters.bookTitle.trim();
      if (filters.fromDate) params.fromDate = filters.fromDate;
      if (filters.toDate) params.toDate = filters.toDate;
      if (filters.status && filters.status !== 'ALL') params.status = filters.status;

      const res = await getBorrowManagement(params);
      const data = Array.isArray(res.data) ? res.data : [];

      if (!mounted.current || version !== requestVersion.current) return;
      setRecords(data);
      setPage(0);
    } catch (error) {

      if (!mounted.current || version !== requestVersion.current) return;
      setLoadError(error.response?.data?.message || 'Không thể tải dữ liệu mượn trả.');
      setRecords([]);
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Không thể tải danh sách mượn trả từ hệ thống!',
      );
    } finally {
      if (mounted.current && version === requestVersion.current) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    setFilterStatus(urlStatus);
    Promise.resolve().then(() => { if (active) loadRecords({ status: urlStatus }); });
    return () => { active = false; mounted.current = false; };
  }, [loadRecords, urlStatus]);

  const handleSearch = (e) => {
    e.preventDefault();
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
    setOnlyOverdue(false);
    const emptyFilters = {
      memberName: '',
      bookTitle: '',
      fromDate: '',
      toDate: '',
      status: 'ALL',
    };
    setAppliedFilters(emptyFilters);
    loadRecords(emptyFilters);
  };

  const handleApprove = async (id) => {
    if (actionLoadingId !== null) return;
    try {
      setActionLoadingId(id);
      await approveBorrow(id);
      toast.success(`Duyệt thành công yêu cầu mượn #${id}. Kho sách đã được tự động trừ 1 cuốn.`);
      await loadRecords(appliedFilters);
    } catch (error) {

      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Không thể duyệt yêu cầu mượn!',
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const confirmReject = async () => {
    if (!itemToReject || isRejecting) return;
    try {
      setIsRejecting(true);
      await rejectBorrow(itemToReject.id);
      toast.success(`Đã từ chối yêu cầu mượn #${itemToReject.id}.`);
      setItemToReject(null);
      await loadRecords(appliedFilters);
    } catch (error) {

      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Không thể từ chối yêu cầu mượn!',
      );
    } finally {
      setIsRejecting(false);
    }
  };

  const handleConfirmReturn = async (id) => {
    if (actionLoadingId !== null) return;
    try {
      setActionLoadingId(id);
      await confirmReturn(id);
      toast.success(`Đã xác nhận thu hồi sách cho phiếu #${id}. Kho sách đã được tự động cộng 1 cuốn.`);
      await loadRecords(appliedFilters);
    } catch (error) {

      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Không thể xác nhận trả sách!',
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const hasActiveFilters =
    appliedFilters.memberName ||
    appliedFilters.bookTitle ||
    appliedFilters.fromDate ||
    appliedFilters.toDate ||
    appliedFilters.status !== 'ALL' ||
    onlyOverdue;

  const filteredRecords = onlyOverdue
    ? records.filter((r) => r.isOverdue && r.status !== 'RETURNED' && r.status !== 'REJECTED')
    : records;

  const overdueCount = records.filter(
    (r) => r.isOverdue && r.status !== 'RETURNED' && r.status !== 'REJECTED'
  ).length;

  // Client-side pagination
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = page * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  return (
    <div className="bm-page">
      <div className="bm-page-wrapper">
        <header className="bm-page-header">
          <div>
            <div className="bm-page-pretitle">THƯ VIỆN / LƯU HÀNH</div>
            <h1>Quản lý mượn & trả sách</h1>
            <p>Xét duyệt yêu cầu mượn sách, từ chối phiếu mượn hoặc xác nhận thu hồi sách từ độc giả.</p>
          </div>
        </header>

        {/* BỘ LỌC TÌM KIẾM */}
        <section className="bm-search-card">
          <div className="bm-search-header">
            <div className="bm-search-title">
              <Filter size={18} />
              <span>Bộ lọc & Tìm kiếm phiếu mượn</span>
            </div>
            {hasActiveFilters && (
              <span className="bm-filter-active-pill">Đang áp dụng bộ lọc</span>
            )}
          </div>

          <form onSubmit={handleSearch} className="bm-search-form">
            <div className="bm-search-grid">
              <div className="form-group">
                <label htmlFor="filter-member">Tên độc giả</label>
                <div className="input-with-icon">
                  <input
                    id="filter-member"
                    type="text"
                    placeholder="Tìm theo tên độc giả..."
                    value={filterMemberName}
                    onChange={(e) => setFilterMemberName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="filter-book">Tên sách</label>
                <div className="input-with-icon">
                  <input
                    id="filter-book"
                    type="text"
                    placeholder="Tìm theo tên cuốn sách..."
                    value={filterBookTitle}
                    onChange={(e) => setFilterBookTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
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
                  <option value="RETURNED">Đã trả (RETURNED)</option>
                  <option value="REJECTED">Bị từ chối (REJECTED)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="filter-from-date">Từ ngày mượn</label>
                <input
                  id="filter-from-date"
                  type="date"
                  value={filterFromDate}
                  onChange={(e) => setFilterFromDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="filter-to-date">Đến ngày mượn</label>
                <input
                  id="filter-to-date"
                  type="date"
                  value={filterToDate}
                  onChange={(e) => setFilterToDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                <label style={{ visibility: 'hidden' }}>Lọc quá hạn</label>
                <button
                  type="button"
                  className={`btn ${onlyOverdue ? 'btn-danger' : 'btn-outline'}`}
                  style={{ height: '42px', width: '100%' }}
                  onClick={() => { setOnlyOverdue(!onlyOverdue); setPage(0); }}
                >
                  <AlertTriangle size={15} />
                  <span>Chỉ sách quá hạn ({overdueCount})</span>
                </button>
              </div>
            </div>

            <div className="bm-search-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleReset}
                disabled={loading}
              >
                <RotateCcw size={15} /> Đặt lại
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                <Search size={15} /> Tìm kiếm
              </button>
            </div>
          </form>
        </section>

        {/* BẢNG DỮ LIỆU */}
        <section className="bm-card">
          <div className="bm-card-header">
            <div>
              <h2>Danh sách yêu cầu luân chuyển sách</h2>
              <p>Lịch sử toàn diện các giao dịch mượn và trả sách trong hệ thống.</p>
            </div>

            <div className="bm-card-badge">{filteredRecords.length} BẢN GHI</div>
          </div>

          <div className="bm-toolbar">
            <div className="bm-toolbar-summary">
              {hasActiveFilters ? (
                <span className="bm-summary-text">
                  Tìm thấy <strong>{filteredRecords.length}</strong> kết quả khớp bộ lọc
                </span>
              ) : (
                <span className="bm-summary-text">
                  Tổng số: <strong>{filteredRecords.length}</strong> phiếu giao dịch
                </span>
              )}
            </div>

            {overdueCount > 0 && !onlyOverdue && (
              <button
                type="button"
                className="bm-overdue-alert-pill"
                onClick={() => { setOnlyOverdue(true); setPage(0); }}
              >
                <AlertTriangle size={14} />
                <span>Có <strong>{overdueCount}</strong> sách quá hạn cần thu hồi</span>
              </button>
            )}
          </div>

          {loading ? (
            <SkeletonTable rows={8} cols={10} />
          ) : loadError ? (<ErrorState message={loadError} onRetry={() => loadRecords(appliedFilters)} />) : filteredRecords.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Không có yêu cầu lưu hành nào"
              description="Hiện chưa có phiếu mượn trả nào khớp với bộ lọc. Khi độc giả đăng ký mượn, yêu cầu sẽ lập tức xuất hiện tại đây."
              secondaryActionLabel={hasActiveFilters ? 'Đặt lại bộ lọc' : undefined}
              onSecondaryAction={handleReset}
            />
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
                    <th>Hạn trả</th>
                    <th>Ngày trả</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'center' }}>Thao tác xét duyệt</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedRecords.map((item) => {
                    const isBusy = actionLoadingId === item.id;
                    const isCurrentlyOverdue =
                      item.isOverdue && item.status !== 'RETURNED' && item.status !== 'REJECTED';

                    return (
                      <tr
                        key={item.id}
                        className={isCurrentlyOverdue ? 'bm-row-overdue' : ''}
                      >
                        <td className="bm-mono">#{item.id}</td>
                        <td className="bm-mono">#{item.memberId}</td>
                        <td className="bm-member-name">{item.memberName}</td>
                        <td className="bm-mono">#{item.bookId}</td>
                        <td className="bm-book-name">{item.bookTitle}</td>
                        <td>{item.borrowDate || '—'}</td>
                        <td>
                          <div style={{ fontWeight: item.dueDate ? 600 : 400 }}>
                            {item.dueDate || '—'}
                          </div>
                          {isCurrentlyOverdue && (
                            <span className="bm-overdue-tag">
                              <Clock size={12} /> Quá hạn ({item.overdueDays} ngày)
                            </span>
                          )}
                          {item.status === 'RETURNED' && item.isOverdue && (
                            <span className="bm-returned-late-tag">
                              <Clock size={12} /> Trả trễ {item.overdueDays} ngày
                            </span>
                          )}
                        </td>
                        <td>{item.returnDate || '—'}</td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {/* BORROW_APPROVE: Hiện nút Duyệt / Từ chối cho yêu cầu PENDING */}
                          {item.status === 'PENDING' && canApprove && (
                            <div className="bm-action-group">
                              <button
                                type="button"
                                className="bm-btn-approve"
                                disabled={actionLoadingId !== null || isRejecting}
                                onClick={() => handleApprove(item.id)}
                              >
                                {isBusy ? <span className="spinner" /> : <Check size={14} />}
                                <span>Duyệt</span>
                              </button>
                              <button
                                type="button"
                                className="bm-btn-reject"
                                disabled={actionLoadingId !== null || isRejecting}
                                onClick={() => setItemToReject(item)}
                              >
                                <X size={14} />
                                <span>Từ chối</span>
                              </button>
                            </div>
                          )}

                          {/* RETURN_CONFIRM: Hiện nút Xác nhận trả cho yêu cầu RETURN_PENDING */}
                          {item.status === 'RETURN_PENDING' && canConfirmReturn && (
                            <div className="bm-action-group">
                              <button
                                type="button"
                                className="bm-btn-confirm"
                                disabled={actionLoadingId !== null || isRejecting}
                                onClick={() => handleConfirmReturn(item.id)}
                              >
                                {isBusy ? <span className="spinner" /> : <CheckCircle2 size={14} />}
                                <span>Xác nhận trả</span>
                              </button>
                            </div>
                          )}

                          {/* Trạng thái không có thao tác hoặc thiếu quyền */}
                          {!((item.status === 'PENDING' && canApprove) || (item.status === 'RETURN_PENDING' && canConfirmReturn)) && (
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

          {filteredRecords.length > pageSize && (
            <div style={{ padding: '0 20px 16px' }}>
              <Pagination
                page={page}
                totalPages={totalPages}
                totalElements={filteredRecords.length}
                pageSize={pageSize}
                onPageChange={(newPage) => setPage(newPage)}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(0);
                }}
              />
            </div>
          )}
        </section>
      </div>

      {/* Accessible Destructive Reject Borrow Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(itemToReject)}
        variant="danger"
        title="Xác nhận từ chối yêu cầu mượn sách"
        message="Bạn có chắc chắn muốn từ chối yêu cầu mượn này của độc giả? Sau khi từ chối, độc giả sẽ nhận được thông báo trạng thái Bị từ chối."
        highlightText={itemToReject ? `Phiếu #${itemToReject.id} • Độc giả: ${itemToReject.memberName} • Sách: "${itemToReject.bookTitle}"` : ''}
        confirmText="Từ chối mượn"
        cancelText="Quay lại"
        isLoading={isRejecting}
        onConfirm={confirmReject}
        onCancel={() => setItemToReject(null)}
      />
    </div>
  );
}

export default BorrowManagement;
