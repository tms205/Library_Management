import BookStage from './BookStage';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Library,
  Users,
  BookOpen,
  Clock,
  ArrowUpRight,
  RotateCw,
  Check,
  X,
  ShieldCheck,
  SlidersHorizontal,
  ClipboardList,
} from 'lucide-react';
import { searchBooks } from '../api/bookApi';
import { searchMembers } from '../api/memberApi';
import { getBorrowManagement, approveBorrow, rejectBorrow } from '../api/borrowApi';
import { getSystemConfig } from '../api/systemConfigApi';
import { getUserInfo, hasPermission } from '../utils/auth';
import { errorMessage } from '../utils/errors';
import { useToast } from '../context/ToastContext';
import useResource from '../hooks/useResource';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import ConfirmDialog from './ConfirmDialog';
import { SkeletonTable } from './Skeleton';
import DistributionDonutChart from './DistributionDonutChart';

const statusConfig = {
  PENDING: { label: 'Chờ duyệt', color: '#f59e0b' },
  BORROWED: { label: 'Đang mượn', color: '#3b82f6' },
  RETURN_PENDING: { label: 'Chờ trả', color: '#a855f7' },
  RETURNED: { label: 'Đã trả', color: '#10b981' },
  REJECTED: { label: 'Từ chối', color: '#ef4444' },
};

export default function OperationsDashboard({ admin = false }) {
  const user = getUserInfo();
  const toast = useToast();
  const [decision, setDecision] = useState(null);
  const [busy, setBusy] = useState(false);

  const loader = useMemo(() => async () => {
    const tasks = [];
    if (hasPermission('BOOK_VIEW')) tasks.push(['books', () => searchBooks({ page: 0, size: 1 })]);
    if (hasPermission('MEMBER_VIEW')) tasks.push(['members', () => searchMembers({ page: 0, size: 1 })]);
    if (hasPermission('BORROW_APPROVE') || hasPermission('RETURN_CONFIRM')) tasks.push(['loans', () => getBorrowManagement()]);
    if (admin && hasPermission('SYSTEM_MAINTENANCE')) tasks.push(['config', () => getSystemConfig()]);
    const results = await Promise.allSettled(tasks.map(([, run]) => run()));
    return Object.fromEntries(
      results.map((r, i) => [
        tasks[i][0],
        r.status === 'fulfilled' ? { data: r.value.data } : { error: errorMessage(r.reason) },
      ]),
    );
  }, [admin]);

  const resource = useResource(loader);
  const sources = resource.data || {};
  const records = sources.loans?.data || [];
  const pending = records.filter((r) => r.status === 'PENDING');
  const current = records.filter((r) => ['BORROWED', 'RETURN_PENDING'].includes(r.status));
  const overdue = current.filter((r) => r.isOverdue);
  const errors = Object.entries(sources).filter(([, value]) => value.error);

  const counts = Object.entries(statusConfig).map(([status, config]) => ({
    status,
    label: config.label,
    color: config.color,
    count: records.filter((r) => r.status === status).length,
  }));

  const metrics = [
    ...(hasPermission('BOOK_VIEW')
      ? [
          {
            label: 'Đầu sách trong thư viện',
            value: sources.books?.data?.totalElements,
            Icon: Library,
            to: '/books',
            caption: 'Khám phá kho sách',
          },
        ]
      : []),
    ...(hasPermission('MEMBER_VIEW')
      ? [
          {
            label: 'Hồ sơ độc giả',
            value: sources.members?.data?.totalElements,
            Icon: Users,
            to: '/members',
            caption: 'Quản lý độc giả',
          },
        ]
      : []),
    ...(hasPermission('BORROW_APPROVE') || hasPermission('RETURN_CONFIRM')
      ? [
          {
            label: 'Sách đang lưu hành',
            value: sources.loans?.data ? current.length : null,
            Icon: BookOpen,
            to: '/borrow-management?status=BORROWED',
            caption: 'Đang mượn & chờ trả',
          },
          {
            label: 'Yêu cầu chờ duyệt',
            value: sources.loans?.data ? pending.length : null,
            Icon: Clock,
            to: '/borrow-management?status=PENDING',
            caption: 'Xử lý yêu cầu',
            highlight: true,
          },
        ]
      : []),
  ];

  async function submitDecision() {
    if (busy || !decision) return;
    setBusy(true);
    try {
      await (decision.approve ? approveBorrow(decision.record.id) : rejectBorrow(decision.record.id));
      toast.success(decision.approve ? 'Đã duyệt yêu cầu mượn.' : 'Đã từ chối yêu cầu mượn.');
      setDecision(null);
      resource.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="operations-dashboard">
      <header className="dashboard-heading cinematic-workspace">
        <div>
          <span className="eyebrow">{admin ? 'TỔNG QUAN THƯ VIỆN' : 'KHÔNG GIAN NGHIỆP VỤ'}</span>
          <h1>{admin ? 'Tổng quan thư viện' : `Chào ${user.username}, bắt đầu ngày mới.`}</h1>
          <p>
            {admin
              ? 'Theo dõi thư viện và kết nối mọi hoạt động trong một không gian.'
              : 'Những yêu cầu cần xử lý và hoạt động lưu hành hôm nay.'}
          </p>
          <button type="button" className="btn btn-outline" disabled={resource.loading} onClick={resource.reload}>
            <RotateCw size={14} /> Làm mới
          </button>
        </div>
        <BookStage compact />
      </header>

      {errors.length > 0 && (
        <div className="dashboard-error" role="alert">
          <strong>Một số dữ liệu chưa tải được.</strong>
          <span>
            {errors
              .map(
                ([key]) =>
                  ({ books: 'Kho sách', members: 'Độc giả', loans: 'Mượn trả', config: 'Cấu hình' })[key],
              )
              .join(', ')}
            . Nhấn Làm mới để thử lại.
          </span>
        </div>
      )}

      {resource.error && <ErrorState message={resource.error} onRetry={resource.reload} />}

      {/* 4 Thẻ chỉ số tổng quan */}
      <section className="overview-metrics">
        {metrics.map(({ label, value, Icon, to, caption, highlight }) => (
          <Link
            key={label}
            to={to}
            className={`overview-metric ${highlight ? 'metric-accent' : ''}`}
          >
            <div className="metric-top">
              <span>{label}</span>
              <Icon size={19} strokeWidth={1.6} />
            </div>
            <strong className="metric-number">
              {resource.loading ? (
                <span className="skeleton metric-skeleton" />
              ) : value == null ? (
                '—'
              ) : (
                value.toLocaleString('vi-VN')
              )}
            </strong>
            <span className="metric-bottom">
              {caption}
              <ArrowUpRight size={15} />
            </span>
          </Link>
        ))}
      </section>

      {/* BỐ CỤC 2 CỘT THEO YÊU CẦU:
          CỘT TRÁI: Phân bổ phiếu mượn (Biểu đồ tròn)  |  CỘT PHẢI: Hoạt động mượn trả
                     ĐIỀU HƯỚNG / Thao tác thường dùng  |              Cần lưu ý
      */}
      <div className="dashboard-columns">
        {/* ========================================================
            CỘT TRÁI (LEFT COLUMN): Phân bổ phiếu mượn & Điều hướng
            ======================================================== */}
        <div className="dashboard-sidebar-column">
          {/* 1. PHÂN BỔ PHIẾU MƯỢN (TOP LEFT - VỚI BIỂU ĐỒ TRÒN NỔI KHI HOVER) */}
          {(hasPermission('BORROW_APPROVE') || hasPermission('RETURN_CONFIRM')) && (
            <section className="dashboard-panel distribution-panel">
              <div className="panel-heading">
                <div>
                  <h2>Phân bổ phiếu mượn</h2>
                  <p>Tỷ lệ lưu hành các phiếu theo trạng thái.</p>
                </div>
              </div>

              <DistributionDonutChart
                counts={counts}
                total={records.length}
                loading={resource.loading}
              />
            </section>
          )}

          {/* 2. ĐIỀU HƯỚNG / THAO TÁC THƯỜNG DÙNG (BOTTOM LEFT) */}
          <section className="dashboard-panel quick-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">ĐIỀU HƯỚNG</span>
                <h2>Thao tác thường dùng</h2>
              </div>
            </div>

            {[
              {
                to: '/books/manage',
                label: 'Quản lý kho sách',
                sub: 'Cập nhật danh mục & tồn kho',
                Icon: Library,
                allowed:
                  hasPermission('BOOK_VIEW') &&
                  ['BOOK_CREATE', 'BOOK_UPDATE', 'BOOK_DELETE', 'BOOK_IMPORT'].some((p) =>
                    hasPermission(p),
                  ),
              },
              {
                to: '/members',
                label: 'Danh bạ độc giả',
                sub: 'Hồ sơ & trạng thái tài khoản',
                Icon: Users,
                allowed: hasPermission('MEMBER_VIEW'),
              },
              {
                to: '/roles',
                label: 'Phân quyền tài khoản',
                sub: 'Quản lý nhóm quyền truy cập',
                Icon: ShieldCheck,
                allowed: admin && hasPermission('SYSTEM_MAINTENANCE'),
              },
              {
                to: '/system-config',
                label: 'Cấu hình hệ thống',
                sub: sources.config?.data
                  ? sources.config.data.maintenanceMode
                    ? 'Đang bật chế độ bảo trì'
                    : 'Đang tắt chế độ bảo trì'
                  : 'Quản lý chế độ bảo trì',
                Icon: SlidersHorizontal,
                allowed: admin && hasPermission('SYSTEM_MAINTENANCE'),
              },
            ]
              .filter((i) => i.allowed)
              .map(({ to, label, sub, Icon }) => (
                <Link className="quick-link" to={to} key={to}>
                  <Icon size={19} />
                  <span>
                    <strong>{label}</strong>
                    <small>{sub}</small>
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
          </section>
        </div>

        {/* ========================================================
            CỘT PHẢI (RIGHT COLUMN): Hoạt động mượn trả & Cần lưu ý
            ======================================================== */}
        <div className="dashboard-main-column">
          {/* 1. HOẠT ĐỘNG MƯỢN TRẢ (TOP RIGHT) */}
          {(hasPermission('BORROW_APPROVE') || hasPermission('RETURN_CONFIRM')) && (
            <section className="dashboard-panel">
              <div className="panel-heading">
                <div>
                  <h2>{admin ? 'Hoạt động mượn trả' : 'Yêu cầu cần xét duyệt'}</h2>
                  <p>
                    {admin
                      ? 'Các phiếu gần nhất theo mã giao dịch.'
                      : 'Xem thông tin trước khi duyệt hoặc từ chối.'}
                  </p>
                </div>
                <Link to="/borrow-management">
                  Xem tất cả <ArrowUpRight size={14} />
                </Link>
              </div>

              {resource.loading ? (
                <SkeletonTable rows={5} cols={4} />
              ) : sources.loans?.error ? (
                <ErrorState message={sources.loans.error} onRetry={resource.reload} />
              ) : (admin ? records : pending).length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title={admin ? 'Chưa có phiếu mượn trả' : 'Bạn đã xử lý hết yêu cầu'}
                  description="Yêu cầu mượn sách từ độc giả sẽ xuất hiện tại đây."
                />
              ) : (
                <div className="dashboard-table-wrap">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Sách / Độc giả</th>
                        <th>Ngày mượn</th>
                        <th>{admin ? 'Trạng thái' : 'Thao tác'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...(admin ? records : pending)]
                        .sort((a, b) => b.id - a.id)
                        .slice(0, 5)
                        .map((r) => (
                          <tr key={r.id}>
                            <td>
                              <strong>{r.bookTitle}</strong>
                              <small>
                                {r.memberName} · #{r.id}
                              </small>
                            </td>
                            <td>{r.borrowDate || '—'}</td>
                            <td>
                              {admin ? (
                                <StatusBadge status={r.status} />
                              ) : (
                                <div className="table-actions">
                                  <button
                                    type="button"
                                    className="btn btn-success"
                                    disabled={busy}
                                    onClick={() => setDecision({ record: r, approve: true })}
                                  >
                                    <Check size={14} /> Duyệt
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-icon"
                                    aria-label={`Từ chối phiếu ${r.id}`}
                                    disabled={busy}
                                    onClick={() => setDecision({ record: r, approve: false })}
                                  >
                                    <X size={15} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* 2. CẦN LƯU Ý / NHỮNG CUỐN SÁCH ĐÃ QUA THỜI HẠN HOÀN TRẢ (BOTTOM RIGHT) */}
          {(hasPermission('BORROW_APPROVE') || hasPermission('RETURN_CONFIRM')) && (
            <section className="dashboard-panel">
              <div className="panel-heading">
                <div>
                  <h2>Cần lưu ý</h2>
                  <p>Những cuốn sách đã qua thời hạn hoàn trả.</p>
                </div>
                <span className="badge-clean badge-warning">
                  {sources.loans?.data ? overdue.length : '—'} quá hạn
                </span>
              </div>

              {overdue.length ? (
                <div className="attention-list">
                  {overdue.slice(0, 4).map((r) => (
                    <Link to="/borrow-management?overdue=true" key={r.id}>
                      <span className="attention-icon">
                        <Clock size={18} />
                      </span>
                      <span>
                        <strong>{r.bookTitle}</strong>
                        <small>
                          {r.memberName} · Hạn {r.dueDate}
                        </small>
                      </span>
                      <span className="text-danger">{r.overdueDays} ngày</span>
                      <ArrowUpRight size={15} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="attention-empty">
                  {resource.loading
                    ? 'Đang kiểm tra…'
                    : sources.loans?.error
                    ? 'Chưa có dữ liệu để kiểm tra quá hạn.'
                    : 'Chưa ghi nhận sách quá hạn trong các phiếu hiện tại.'}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(decision)}
        title={decision?.approve ? 'Duyệt yêu cầu mượn' : 'Từ chối yêu cầu mượn'}
        message={
          decision?.approve
            ? 'Thư viện sẽ xác nhận phiếu mượn và cập nhật số lượng sách trong kho.'
            : 'Phiếu mượn sẽ được chuyển sang trạng thái bị từ chối.'
        }
        highlightText={decision ? `${decision.record.bookTitle} · ${decision.record.memberName}` : ''}
        variant={decision?.approve ? 'info' : 'danger'}
        isLoading={busy}
        onConfirm={submitDecision}
        onCancel={() => setDecision(null)}
      />
    </div>
  );
}
