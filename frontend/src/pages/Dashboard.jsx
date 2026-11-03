import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { hasPermission, hasAnyPermission, getUserInfo } from '../utils/auth';
import { searchBooks } from '../api/bookApi';
import { searchMembers } from '../api/memberApi';
import { getBorrowManagement, getMyBorrowedBooks } from '../api/borrowApi';
import { getSystemConfig } from '../api/systemConfigApi';
import StatusBadge from '../components/StatusBadge';

import '../styles/dashboard.css';

/**
 * Format ngày theo chuẩn Việt Nam DD/MM/YYYY
 */
const formatDateVN = (dateString) => {
  if (!dateString) return '—';
  try {
    const [year, month, day] = dateString.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return dateString;
  }
};

function Dashboard() {
  const user = getUserInfo();

  // Kiểm tra quyền hạn từ JWT Payload
  const canViewBooks = hasPermission('BOOK_VIEW');
  const canManageBooks = hasAnyPermission(['BOOK_CREATE', 'BOOK_UPDATE', 'BOOK_DELETE', 'BOOK_IMPORT']);
  const canViewMembers = hasPermission('MEMBER_VIEW');
  const canBorrow = hasPermission('BORROW_BOOK');
  const canReturn = hasPermission('RETURN_BOOK');
  const canApproveBorrow = hasPermission('BORROW_APPROVE');
  const canConfirmReturn = hasPermission('RETURN_CONFIRM');
  const canManageBorrow = canApproveBorrow || canConfirmReturn;
  const canSystemConfig = hasPermission('SYSTEM_MAINTENANCE');

  // Thống kê số liệu
  const [stats, setStats] = useState({
    totalBooks: null,
    totalMembers: null,
    pendingApprovals: 0,
    borrowedActiveCount: 0,
    returnedCount: 0,
    overdueCount: 0,
    myBorrowedCount: 0,
    myPendingCount: 0,
    myReturnedCount: 0,
    myOverdueCount: 0,
    loading: true,
  });

  // Dữ liệu trực quan hóa
  const [overdueList, setOverdueList] = useState([]);
  const [topBooks, setTopBooks] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [myActiveBooks, setMyActiveBooks] = useState([]);
  const [newBooks, setNewBooks] = useState([]);
  const [activeOpsTab, setActiveOpsTab] = useState('primary'); // 'primary' | 'newBooks'
  const [isMaintenance, setIsMaintenance] = useState(false);
  // State theo dõi phân đoạn biểu đồ tròn đang được rê chuột vào
  const [hoveredSegment, setHoveredSegment] = useState(null);

  // Chuỗi ngày hiện tại tiếng Việt
  const todayText = useMemo(() => {
    const now = new Date();
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = days[now.getDay()];
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${dayName}, ${d}/${m}/${y}`;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadDashboardData = async () => {
      try {
        const promises = [];

        // 1. Thống kê tổng số sách
        if (canViewBooks) {
          promises.push(
            searchBooks({ page: 0, size: 5, sortBy: 'id', direction: 'desc' })
              .then((res) => {
                const data = res.data;
                const total =
                  data?.totalElements ??
                  (Array.isArray(data?.content) ? data.content.length : Array.isArray(data) ? data.length : 0);
                return { totalBooks: total, latestBooks: data?.content || [] };
              })
              .catch(() => ({ totalBooks: '—', latestBooks: [] })),
          );
        }

        // 2. Thống kê tổng số thành viên
        if (canViewMembers) {
          promises.push(
            searchMembers({ page: 0, size: 1 })
              .then((res) => {
                const data = res.data;
                const total =
                  data?.totalElements ??
                  (Array.isArray(data?.content) ? data.content.length : Array.isArray(data) ? data.length : 0);
                return { totalMembers: total };
              })
              .catch(() => ({ totalMembers: '—' })),
          );
        }

        // 3. Phân tích chi tiết mượn/trả cho Thủ thư & Admin
        if (canApproveBorrow) {
          promises.push(
            getBorrowManagement()
              .then((res) => {
                const list = Array.isArray(res.data) ? res.data : [];

                // Đếm theo trạng thái
                const pending = list.filter((r) => r.status === 'PENDING').length;
                const borrowed = list.filter((r) => r.status === 'BORROWED').length;
                const returned = list.filter((r) => r.status === 'RETURNED').length;

                // Sách quá hạn
                const overdueRecords = list
                  .filter((r) => (r.status === 'BORROWED' || r.status === 'RETURN_PENDING') && r.isOverdue)
                  .sort((a, b) => (b.overdueDays || 0) - (a.overdueDays || 0));

                // Top 5 sách được mượn nhiều nhất
                const bookCounts = {};
                list.forEach((item) => {
                  if (item.bookTitle) {
                    bookCounts[item.bookTitle] = (bookCounts[item.bookTitle] || 0) + 1;
                  }
                });
                const top5 = Object.entries(bookCounts)
                  .map(([title, count]) => ({ title, count }))
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 5);

                // 5 giao dịch gần nhất
                const recent = [...list]
                  .sort((a, b) => (b.id || 0) - (a.id || 0))
                  .slice(0, 5);

                return {
                  pendingApprovals: pending,
                  borrowedActiveCount: borrowed,
                  returnedCount: returned,
                  overdueCount: overdueRecords.length,
                  overdueRecords: overdueRecords.slice(0, 5),
                  topBooksList: top5,
                  recentList: recent,
                };
              })
              .catch(() => ({
                pendingApprovals: 0,
                borrowedActiveCount: 0,
                returnedCount: 0,
                overdueCount: 0,
                overdueRecords: [],
                topBooksList: [],
                recentList: [],
              })),
          );
        }

        // 4. Phân tích tủ sách của user hiện tại
        if (canBorrow || canReturn) {
          promises.push(
            getMyBorrowedBooks()
              .then((res) => {
                const list = Array.isArray(res.data) ? res.data : [];
                const active = list.filter((r) => r.status === 'BORROWED');
                const pending = list.filter((r) => r.status === 'PENDING').length;
                const returned = list.filter((r) => r.status === 'RETURNED').length;
                const overdue = active.filter((r) => r.isOverdue);

                const recent = [...list]
                  .sort((a, b) => (b.id || 0) - (a.id || 0))
                  .slice(0, 5);

                return {
                  myBorrowedCount: active.length,
                  myPendingCount: pending,
                  myReturnedCount: returned,
                  myOverdueCount: overdue.length,
                  myActiveList: active,
                  myRecentList: recent,
                };
              })
              .catch(() => ({
                myBorrowedCount: 0,
                myPendingCount: 0,
                myReturnedCount: 0,
                myOverdueCount: 0,
                myActiveList: [],
                myRecentList: [],
              })),
          );
        }

        // 5. Kiểm tra chế độ bảo trì nếu là Admin
        if (canSystemConfig) {
          promises.push(
            getSystemConfig()
              .then((res) => ({ isMaintenance: res.data?.maintenanceMode === true }))
              .catch(() => ({ isMaintenance: false })),
          );
        }

        const results = await Promise.all(promises);
        if (!cancelled) {
          const merged = Object.assign({}, ...results);

          setStats((prev) => ({
            ...prev,
            totalBooks: merged.totalBooks ?? prev.totalBooks,
            totalMembers: merged.totalMembers ?? prev.totalMembers,
            pendingApprovals: merged.pendingApprovals ?? prev.pendingApprovals,
            borrowedActiveCount: merged.borrowedActiveCount ?? prev.borrowedActiveCount,
            returnedCount: merged.returnedCount ?? prev.returnedCount,
            overdueCount: merged.overdueCount ?? prev.overdueCount,
            myBorrowedCount: merged.myBorrowedCount ?? prev.myBorrowedCount,
            myPendingCount: merged.myPendingCount ?? prev.myPendingCount,
            myReturnedCount: merged.myReturnedCount ?? prev.myReturnedCount,
            myOverdueCount: merged.myOverdueCount ?? prev.myOverdueCount,
            loading: false,
          }));

          if (merged.overdueRecords) setOverdueList(merged.overdueRecords);
          if (merged.topBooksList && merged.topBooksList.length > 0) {
            setTopBooks(merged.topBooksList);
          } else if (merged.latestBooks && merged.latestBooks.length > 0) {
            // Nếu không có lượt mượn hoặc là độc giả, dùng danh sách sách mới nhất để gợi ý
            setTopBooks(
              merged.latestBooks.slice(0, 5).map((b) => ({
                title: b.title,
                count: b.quantity || 1,
              })),
            );
          }

          if (merged.latestBooks) {
            setNewBooks(merged.latestBooks);
          }

          if (canApproveBorrow && merged.recentList) {
            setRecentActivity(merged.recentList);
          } else if (merged.myRecentList) {
            setRecentActivity(merged.myRecentList);
          }

          if (merged.myActiveList) setMyActiveBooks(merged.myActiveList);
          if (typeof merged.isMaintenance === 'boolean') setIsMaintenance(merged.isMaintenance);
        }
      } catch {
        if (!cancelled) {
          setStats((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [canViewBooks, canViewMembers, canApproveBorrow, canBorrow, canReturn, canSystemConfig]);

  // Tính tỷ lệ % cho biểu đồ phân bổ trạng thái
  const distributionData = useMemo(() => {
    if (canApproveBorrow) {
      const activeNormal = Math.max(0, (stats.borrowedActiveCount || 0) - (stats.overdueCount || 0));
      const total =
        activeNormal +
        (stats.overdueCount || 0) +
        (stats.returnedCount || 0) +
        (stats.pendingApprovals || 0);

      if (total === 0) {
        return {
          total: 0,
          activePct: 0,
          returnedPct: 0,
          pendingPct: 0,
          overduePct: 0,
        };
      }

      return {
        total,
        activeNormal,
        activePct: Math.round((activeNormal / total) * 100),
        returnedPct: Math.round(((stats.returnedCount || 0) / total) * 100),
        pendingPct: Math.round(((stats.pendingApprovals || 0) / total) * 100),
        overduePct: Math.round(((stats.overdueCount || 0) / total) * 100),
      };
    } else {
      // Độc giả: tính theo tủ sách cá nhân
      const myActiveNormal = Math.max(0, (stats.myBorrowedCount || 0) - (stats.myOverdueCount || 0));
      const total =
        myActiveNormal +
        (stats.myOverdueCount || 0) +
        (stats.myReturnedCount || 0) +
        (stats.myPendingCount || 0);

      if (total === 0) {
        return {
          total: 0,
          activePct: 0,
          returnedPct: 0,
          pendingPct: 0,
          overduePct: 0,
        };
      }

      return {
        total,
        activeNormal: myActiveNormal,
        activePct: Math.round((myActiveNormal / total) * 100),
        returnedPct: Math.round(((stats.myReturnedCount || 0) / total) * 100),
        pendingPct: Math.round(((stats.myPendingCount || 0) / total) * 100),
        overduePct: Math.round(((stats.myOverdueCount || 0) / total) * 100),
      };
    }
  }, [
    canApproveBorrow,
    stats.borrowedActiveCount,
    stats.returnedCount,
    stats.pendingApprovals,
    stats.overdueCount,
    stats.myBorrowedCount,
    stats.myReturnedCount,
    stats.myPendingCount,
    stats.myOverdueCount,
  ]);

  // Tìm lượt mượn cao nhất để tính thanh tiến độ Top Books
  const maxBorrowCount = useMemo(() => {
    if (topBooks.length === 0) return 1;
    return Math.max(...topBooks.map((b) => b.count || 1));
  }, [topBooks]);

  // Dữ liệu 4 phân đoạn cho biểu đồ tròn
  const chartSegments = useMemo(() => {
    const isStaff = canApproveBorrow;
    return [
      {
        key: 'returned',
        label: isStaff ? 'Đã hoàn trả' : 'Đã đọc xong',
        count: isStaff ? (stats.returnedCount || 0) : (stats.myReturnedCount || 0),
        pct: distributionData.returnedPct,
        color: '#10b981',
        cardClass: 'card-green',
      },
      {
        key: 'active',
        label: isStaff ? 'Đang mượn' : 'Đang giữ đọc',
        count: distributionData.activeNormal ?? 0,
        pct: distributionData.activePct,
        color: '#4f46e5',
        cardClass: 'card-blue',
      },
      {
        key: 'pending',
        label: 'Chờ duyệt',
        count: isStaff ? (stats.pendingApprovals || 0) : (stats.myPendingCount || 0),
        pct: distributionData.pendingPct,
        color: '#f59e0b',
        cardClass: 'card-amber',
      },
      {
        key: 'overdue',
        label: 'Quá hạn',
        count: isStaff ? (stats.overdueCount || 0) : (stats.myOverdueCount || 0),
        pct: distributionData.overduePct,
        color: '#ef4444',
        cardClass: 'card-red',
      },
    ];
  }, [canApproveBorrow, stats, distributionData]);

  // Tính toán tọa độ hình học các cung tròn SVG cho Donut Chart
  const donutSlices = useMemo(() => {
    const activeSlices = chartSegments.filter((s) => (s.count || 0) > 0);
    const totalCount = activeSlices.reduce((sum, s) => sum + (s.count || 0), 0);

    if (totalCount === 0) return [];

    let currentAngle = -Math.PI / 2; // Bắt đầu ở góc 12 giờ
    const cx = 130;
    const cy = 130;
    const R = 95; // Bán kính ngoài
    const r = 55; // Bán kính trong (tạo lỗ donut)
    const explodeDistance = 10; // Khoảng cách đẩy lồi lên khi hover

    return activeSlices.map((seg) => {
      const fraction = seg.count / totalCount;
      const angleSpan = fraction >= 1 ? 2 * Math.PI - 0.0001 : fraction * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = startAngle + angleSpan;
      const midAngle = startAngle + angleSpan / 2;

      currentAngle = endAngle;

      const x1 = cx + R * Math.cos(startAngle);
      const y1 = cy + R * Math.sin(startAngle);
      const x2 = cx + R * Math.cos(endAngle);
      const y2 = cy + R * Math.sin(endAngle);

      const x3 = cx + r * Math.cos(endAngle);
      const y3 = cy + r * Math.sin(endAngle);
      const x4 = cx + r * Math.cos(startAngle);
      const y4 = cy + r * Math.sin(startAngle);

      const largeArcFlag = angleSpan > Math.PI ? 1 : 0;

      const pathD = [
        `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
        `A ${R} ${R} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
        `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
        `A ${r} ${r} 0 ${largeArcFlag} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
        'Z',
      ].join(' ');

      // Vector lồi ra theo phương hướng tâm của từng phần
      const dx = Number((Math.cos(midAngle) * explodeDistance).toFixed(2));
      const dy = Number((Math.sin(midAngle) * explodeDistance).toFixed(2));

      return {
        ...seg,
        pathD,
        dx,
        dy,
      };
    });
  }, [chartSegments]);

  // Thông tin phân đoạn đang được rê chuột vào
  const activeSegmentData = useMemo(() => {
    if (!hoveredSegment) return null;
    return chartSegments.find((s) => s.key === hoveredSegment) || null;
  }, [hoveredSegment, chartSegments]);

  return (
    <div className="dashboard-content-wrapper">
      {/* ========================================================
          1. HERO BANNER CHÀO MỪNG & TRẠNG THÁI HỆ THỐNG
          ======================================================== */}
      <section className="dash-hero">
        <div className="dash-hero-content">
          <div className="dash-hero-meta">
            <span className={`dash-meta-badge lib-role-${user.badgeColor}`}>
              🛡️ {user.groupName}
            </span>

            <span className="dash-meta-badge dash-meta-date">
              📅 {todayText}
            </span>

            {isMaintenance ? (
              <span className="dash-meta-badge dash-meta-maintenance">
                🟠 Chế độ bảo trì hệ thống
              </span>
            ) : (
              <span className="dash-meta-badge dash-meta-system">
                🟢 Trực tuyến & Sẵn sàng
              </span>
            )}
          </div>

          <h2 className="dash-hero-title">Xin chào, {user.username}! 👋</h2>
          <p className="dash-hero-desc">
            {canSystemConfig
              ? 'Chào mừng Quản trị viên. Bạn có toàn quyền cấu hình vận hành, phân quyền người dùng và kiểm soát toàn bộ cơ sở dữ liệu thư viện.'
              : canApproveBorrow
                ? 'Chào mừng Thủ thư. Hãy kiểm tra các yêu cầu mượn đang chờ xét duyệt và theo dõi sát sao tình trạng sách quá hạn để thu hồi kịp thời.'
                : 'Chào mừng bạn đến với Thư viện số. Khám phá hàng trăm đầu sách phong phú, theo dõi thời hạn hoàn trả và nâng cao trải nghiệm đọc sách của bạn.'}
          </p>
        </div>

        <div className="dash-hero-art" title="Thư viện số">
          📚
        </div>
      </section>

      {/* ========================================================
          2. CẢNH BÁO QUÁ HẠN / HÀNH ĐỘNG KHẨN CẤP
          ======================================================== */}
      <div className="dash-alert-container">
        {/* Cảnh báo cho Thủ thư / Admin nếu có sách quá hạn */}
        {canApproveBorrow && stats.overdueCount > 0 && (
          <div className="dash-alert dash-alert-danger">
            <div className="dash-alert-left">
              <div className="dash-alert-icon">🚨</div>
              <div>
                <div className="dash-alert-title">CẢNH BÁO SÁCH QUÁ HẠN THU HỒI</div>
                <div className="dash-alert-msg">
                  Hiện có <strong>{stats.overdueCount}</strong> cuốn sách đã vượt quá hạn trả 14 ngày. Cần nhắc nhở độc giả và tiến hành thu hồi sách ngay.
                </div>
              </div>
            </div>
            <Link to="/borrow-management" className="dash-alert-btn">
              Xem danh sách quá hạn &rarr;
            </Link>
          </div>
        )}

        {/* Nhắc nhở cho Độc giả nếu có sách quá hạn của chính mình */}
        {(canBorrow || canReturn) && stats.myOverdueCount > 0 && (
          <div className="dash-alert dash-alert-danger">
            <div className="dash-alert-left">
              <div className="dash-alert-icon">⚠️</div>
              <div>
                <div className="dash-alert-title">CHÚ Ý: BẠN CÓ SÁCH QUÁ HẠN!</div>
                <div className="dash-alert-msg">
                  Bạn đang giữ <strong>{stats.myOverdueCount}</strong> cuốn sách đã quá thời hạn trả. Vui lòng gửi yêu cầu hoàn trả sách để không ảnh hưởng đến quyền mượn sách.
                </div>
              </div>
            </div>
            <Link to="/return" className="dash-alert-btn">
              Trả sách ngay &rarr;
            </Link>
          </div>
        )}

        {/* Thông báo cho Thủ thư nếu có phiếu chờ duyệt */}
        {canApproveBorrow && stats.pendingApprovals > 0 && (
          <div className="dash-alert dash-alert-warning">
            <div className="dash-alert-left">
              <div className="dash-alert-icon">⏳</div>
              <div>
                <div className="dash-alert-title">YÊU CẦU MƯỢN ĐANG CHỜ DUYỆT</div>
                <div className="dash-alert-msg">
                  Có <strong>{stats.pendingApprovals}</strong> phiếu mượn sách mới từ bạn đọc đang chờ bạn phê duyệt.
                </div>
              </div>
            </div>
            <Link to="/borrow-management" className="dash-alert-btn">
              Xét duyệt phiếu &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* ========================================================
          3. STATS CARDS (KPIs DỰA THEO QUYỀN HẠN THỰC TẾ)
          ======================================================== */}
      <div className="dash-kpi-grid">
        {/* Card: Tổng số đầu sách */}
        {canViewBooks && (
          <Link to={canManageBooks ? '/books/manage' : '/books'} className="dash-kpi-card">
            <div className="dash-kpi-icon icon-blue">📖</div>
            <div className="dash-kpi-info">
              <div className="dash-kpi-label">KHO SÁCH THƯ VIỆN</div>
              <div className="dash-kpi-value">
                {stats.loading ? <div className="dash-skeleton dash-skeleton-val" /> : stats.totalBooks ?? '—'}
              </div>
              <div className="dash-kpi-sub">
                {stats.loading ? (
                  <div className="dash-skeleton dash-skeleton-sub" />
                ) : (
                  <>
                    <span>Đầu sách trong hệ thống</span>
                    <span className="dash-trend-tag success">Đầy đủ kho</span>
                  </>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Card: Độc giả / Thành viên (Staff/Admin) */}
        {canViewMembers && (
          <Link to="/members" className="dash-kpi-card">
            <div className="dash-kpi-icon icon-green">👥</div>
            <div className="dash-kpi-info">
              <div className="dash-kpi-label">ĐỘC GIẢ THÀNH VIÊN</div>
              <div className="dash-kpi-value">
                {stats.loading ? <div className="dash-skeleton dash-skeleton-val" /> : stats.totalMembers ?? '—'}
              </div>
              <div className="dash-kpi-sub">
                {stats.loading ? (
                  <div className="dash-skeleton dash-skeleton-sub" />
                ) : (
                  <>
                    <span>Tài khoản bạn đọc đăng ký</span>
                    <span className="dash-trend-tag neutral">Hoạt động</span>
                  </>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Card: Sách đang cho mượn (Staff/Admin) */}
        {canApproveBorrow && (
          <div className="dash-kpi-card">
            <div className="dash-kpi-icon icon-purple">📚</div>
            <div className="dash-kpi-info">
              <div className="dash-kpi-label">SÁCH ĐANG CHO MƯỢN</div>
              <div className="dash-kpi-value">
                {stats.loading ? <div className="dash-skeleton dash-skeleton-val" /> : stats.borrowedActiveCount}
              </div>
              <div className="dash-kpi-sub">
                {stats.loading ? (
                  <div className="dash-skeleton dash-skeleton-sub" />
                ) : (
                  <>
                    <span>Cuốn đang lưu hành ngoài kho</span>
                    <span className="dash-trend-tag neutral">Đang lưu hành</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Card: Yêu cầu chờ duyệt (Staff/Admin) */}
        {canApproveBorrow && (
          <Link
            to="/borrow-management"
            className={`dash-kpi-card ${stats.pendingApprovals > 0 ? 'has-alert' : ''}`}
          >
            <div className="dash-kpi-icon icon-amber">⏳</div>
            <div className="dash-kpi-info">
              <div className="dash-kpi-label">CHỜ PHÊ DUYỆT</div>
              <div className={`dash-kpi-value ${stats.pendingApprovals > 0 ? 'warning' : ''}`}>
                {stats.loading ? <div className="dash-skeleton dash-skeleton-val" /> : stats.pendingApprovals}
              </div>
              <div className="dash-kpi-sub">
                {stats.loading ? (
                  <div className="dash-skeleton dash-skeleton-sub" />
                ) : (
                  <>
                    <span>Phiếu mượn cần thủ thư xử lý</span>
                    {stats.pendingApprovals > 0 ? (
                      <span className="dash-trend-tag warning">Cần xử lý</span>
                    ) : (
                      <span className="dash-trend-tag success">Đã xong</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Card: Sách quá hạn thu hồi (Staff/Admin) */}
        {canApproveBorrow && (
          <Link
            to="/borrow-management"
            className={`dash-kpi-card ${stats.overdueCount > 0 ? 'has-alert' : ''}`}
          >
            <div className="dash-kpi-icon icon-red">🚨</div>
            <div className="dash-kpi-info">
              <div className="dash-kpi-label">SÁCH QUÁ HẠN 14 NGÀY</div>
              <div className={`dash-kpi-value ${stats.overdueCount > 0 ? 'danger' : ''}`}>
                {stats.loading ? <div className="dash-skeleton dash-skeleton-val" /> : stats.overdueCount}
              </div>
              <div className="dash-kpi-sub">
                {stats.loading ? (
                  <div className="dash-skeleton dash-skeleton-sub" />
                ) : (
                  <>
                    <span>Cần gửi thông báo thu hồi</span>
                    {stats.overdueCount > 0 ? (
                      <span className="dash-trend-tag danger">Cần thu hồi</span>
                    ) : (
                      <span className="dash-trend-tag success">0 vi phạm</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Dành riêng cho Độc giả thường: Sách tôi đang mượn */}
        {!canApproveBorrow && (canBorrow || canReturn) && (
          <Link to="/return" className="dash-kpi-card">
            <div className="dash-kpi-icon icon-purple">📚</div>
            <div className="dash-kpi-info">
              <div className="dash-kpi-label">SÁCH TÔI ĐANG MƯỢN</div>
              <div className="dash-kpi-value">
                {stats.loading ? <div className="dash-skeleton dash-skeleton-val" /> : stats.myBorrowedCount}
              </div>
              <div className="dash-kpi-sub">
                {stats.loading ? (
                  <div className="dash-skeleton dash-skeleton-sub" />
                ) : (
                  <>
                    <span>Cuốn sách trong tay bạn</span>
                    <span className="dash-trend-tag neutral">Đang giữ</span>
                  </>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Dành riêng cho Độc giả thường: Yêu cầu chờ duyệt */}
        {!canApproveBorrow && (canBorrow || canReturn) && (
          <Link to="/return" className="dash-kpi-card">
            <div className="dash-kpi-icon icon-amber">⏳</div>
            <div className="dash-kpi-info">
              <div className="dash-kpi-label">YÊU CẦU CHỜ DUYỆT</div>
              <div className="dash-kpi-value">
                {stats.loading ? <div className="dash-skeleton dash-skeleton-val" /> : stats.myPendingCount}
              </div>
              <div className="dash-kpi-sub">
                {stats.loading ? (
                  <div className="dash-skeleton dash-skeleton-sub" />
                ) : (
                  <>
                    <span>Đang chờ thủ thư phản hồi</span>
                    {stats.myPendingCount > 0 ? (
                      <span className="dash-trend-tag warning">Đang chờ</span>
                    ) : (
                      <span className="dash-trend-tag success">Đã xong</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Dành riêng cho Độc giả thường: Sách đã hoàn trả */}
        {!canApproveBorrow && (canBorrow || canReturn) && (
          <Link to="/return" className="dash-kpi-card">
            <div className="dash-kpi-icon icon-green">✅</div>
            <div className="dash-kpi-info">
              <div className="dash-kpi-label">SÁCH ĐÃ HOÀN TRẢ</div>
              <div className="dash-kpi-value">
                {stats.loading ? <div className="dash-skeleton dash-skeleton-val" /> : stats.myReturnedCount}
              </div>
              <div className="dash-kpi-sub">
                {stats.loading ? (
                  <div className="dash-skeleton dash-skeleton-sub" />
                ) : (
                  <>
                    <span>Lịch sử đã đọc hoàn tất</span>
                    <span className="dash-trend-tag success">Hoàn tất</span>
                  </>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Dành riêng cho Độc giả thường: Tình trạng quá hạn */}
        {!canApproveBorrow && (canBorrow || canReturn) && (
          <Link
            to="/return"
            className={`dash-kpi-card ${stats.myOverdueCount > 0 ? 'has-alert' : ''}`}
          >
            <div className="dash-kpi-icon icon-red">⏰</div>
            <div className="dash-kpi-info">
              <div className="dash-kpi-label">TÌNH TRẠNG HẠN TRẢ</div>
              <div className={`dash-kpi-value ${stats.myOverdueCount > 0 ? 'danger' : ''}`}>
                {stats.loading ? <div className="dash-skeleton dash-skeleton-val" /> : stats.myOverdueCount > 0 ? `${stats.myOverdueCount} trễ hạn` : 'Đúng hạn'}
              </div>
              <div className="dash-kpi-sub">
                {stats.loading ? (
                  <div className="dash-skeleton dash-skeleton-sub" />
                ) : (
                  <>
                    <span>Thời hạn mượn 14 ngày/cuốn</span>
                    {stats.myOverdueCount > 0 ? (
                      <span className="dash-trend-tag danger">Cần trả ngay</span>
                    ) : (
                      <span className="dash-trend-tag success">100% đúng hạn</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* ========================================================
          4. VISUAL ANALYTICS: BIỂU ĐỒ PHÂN BỔ & TOP SÁCH NỔI BẬT
          ======================================================== */}
      <div className="dash-analytics-grid">
        {/* Panel 1: Biểu đồ Tỷ lệ Luân chuyển Sách */}
        <div className="dash-panel">
          <div className="dash-panel-header">
            <h3 className="dash-panel-title">
              <span className="icon">📊</span>
              {canApproveBorrow ? 'Tỷ lệ luân chuyển sách thư viện' : 'Phân bổ tủ sách cá nhân'}
            </h3>
            <span className="dash-panel-badge">
              Tổng cộng: {distributionData.total} giao dịch
            </span>
          </div>

          <p style={{ margin: '0 0 14px', fontSize: '15.5px', color: '#64748b' }}>
            {canApproveBorrow
              ? 'Thống kê trực quan tỷ lệ sách đang lưu hành, sách đã thu hồi thành công, yêu cầu đang chờ và sách trễ hạn.'
              : 'Theo dõi tỷ lệ hoàn thành đọc sách, số sách đang mượn và tình trạng hạn trả của bạn.'}
          </p>

          {/* Biểu đồ hình tròn Donut SVG tương tác: di chuột lồi lên & hiện % */}
          <div className="donut-chart-layout">
            <div className="donut-svg-wrapper">
              <svg
                viewBox="0 0 260 260"
                className={`donut-svg ${hoveredSegment ? 'has-hover' : ''}`}
              >
                <defs>
                  {/* Bộ lọc bóng đổ khi lồi lên */}
                  <filter id="donut-shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="rgba(15, 23, 42, 0.28)" />
                  </filter>
                </defs>

                {donutSlices.length === 0 ? (
                  // Placeholder nếu chưa có số liệu
                  <g>
                    <circle cx="130" cy="130" r="95" fill="none" stroke="#f1f5f9" strokeWidth="40" />
                    <text
                      x="130"
                      y="135"
                      textAnchor="middle"
                      style={{ fontSize: '15px', fill: '#94a3b8', fontWeight: 600 }}
                    >
                      Chưa có số liệu
                    </text>
                  </g>
                ) : (
                  donutSlices.map((slice) => {
                    const isHovered = hoveredSegment === slice.key;
                    const transform = isHovered
                      ? `translate(${slice.dx}px, ${slice.dy}px) scale(1.04)`
                      : 'translate(0px, 0px) scale(1)';

                    return (
                      <g
                        key={slice.key}
                        className={`donut-slice-group ${isHovered ? 'is-active' : ''}`}
                        style={{
                          transform,
                          transformOrigin: '130px 130px',
                          transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={() => setHoveredSegment(slice.key)}
                        onMouseLeave={() => setHoveredSegment(null)}
                      >
                        <path
                          d={slice.pathD}
                          fill={slice.color}
                          className="donut-slice-path"
                          filter={isHovered ? 'url(#donut-shadow)' : undefined}
                        />
                        <title>{`${slice.label}: ${slice.count} cuốn (${slice.pct}%)`}</title>
                      </g>
                    );
                  })
                )}

                {/* Thông tin phần trăm và chi tiết ở tâm hình tròn */}
                {activeSegmentData ? (
                  <g className="donut-center-badge">
                    <text
                      x="130"
                      y="118"
                      textAnchor="middle"
                      style={{
                        fontSize: '30px',
                        fontWeight: '800',
                        fill: activeSegmentData.color,
                        transition: 'fill 0.2s ease',
                      }}
                    >
                      {activeSegmentData.pct}%
                    </text>
                    <text
                      x="130"
                      y="138"
                      textAnchor="middle"
                      style={{
                        fontSize: '15px',
                        fontWeight: '750',
                        fill: '#0f172a',
                      }}
                    >
                      {activeSegmentData.label}
                    </text>
                    <text
                      x="130"
                      y="154"
                      textAnchor="middle"
                      style={{
                        fontSize: '13.5px',
                        fontWeight: '600',
                        fill: '#64748b',
                      }}
                    >
                      {activeSegmentData.count} cuốn sách
                    </text>
                  </g>
                ) : (
                  <g className="donut-center-badge">
                    <text
                      x="130"
                      y="122"
                      textAnchor="middle"
                      style={{
                        fontSize: '27px',
                        fontWeight: '800',
                        fill: '#0f172a',
                      }}
                    >
                      {distributionData.total}
                    </text>
                    <text
                      x="130"
                      y="140"
                      textAnchor="middle"
                      style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        fill: '#64748b',
                      }}
                    >
                      Tổng giao dịch
                    </text>
                    <text
                      x="130"
                      y="155"
                      textAnchor="middle"
                      style={{
                        fontSize: '12.5px',
                        fontWeight: '500',
                        fill: '#94a3b8',
                      }}
                    >
                      (Di chuột xem %)
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Chú giải tương tác (Legend) hai chiều */}
            <div className="donut-legend-col">
              {chartSegments.map((seg) => {
                const isActive = hoveredSegment === seg.key;
                return (
                  <div
                    key={seg.key}
                    className={`dash-legend-card ${seg.cardClass} ${isActive ? 'active' : ''}`}
                    onMouseEnter={() => setHoveredSegment(seg.key)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    title={`Di chuột để làm nổi bật nhóm ${seg.label}`}
                  >
                    <div className="dash-legend-label">
                      <span className="dash-legend-dot" style={{ background: seg.color }} />
                      <span>{seg.label}</span>
                    </div>
                    <div className="dash-legend-val" style={{ color: isActive ? seg.color : undefined }}>
                      {seg.count}
                      <span>({seg.pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel 2: Top 5 Đầu Sách Được Quan Tâm Nhất */}
        <div className="dash-panel">
          <div className="dash-panel-header">
            <h3 className="dash-panel-title">
              <span className="icon">🏆</span>
              {canApproveBorrow ? 'Top 5 sách được mượn nhiều nhất' : 'Đầu sách thịnh hành trong thư viện'}
            </h3>
            <Link
              to="/books"
              style={{ fontSize: '14.5px', color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}
            >
              Xem tất cả &rarr;
            </Link>
          </div>

          <p style={{ margin: '0 0 16px', fontSize: '15.5px', color: '#64748b' }}>
            {canApproveBorrow
              ? 'Xếp hạng các cuốn sách có tần suất mượn cao nhất giúp thủ thư lên kế hoạch bổ sung đầu sách.'
              : 'Gợi ý các cuốn sách đang được nhiều bạn đọc mượn nhất để bạn dễ dàng lựa chọn.'}
          </p>

          {topBooks.length === 0 ? (
            <div className="dash-empty-state">
              <div className="dash-empty-icon">📖</div>
              <h4>Chưa có dữ liệu thống kê</h4>
              <p>Dữ liệu xếp hạng sẽ hiển thị tự động khi độc giả bắt đầu mượn sách.</p>
            </div>
          ) : (
            <div className="top-books-list">
              {topBooks.map((book, index) => {
                const rankClass =
                  index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-default';
                const rankBadge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                const barWidth = Math.max(12, Math.round(((book.count || 1) / maxBorrowCount) * 100));

                return (
                  <div key={book.title + index} className="top-book-item">
                    <div className={`top-book-rank ${rankClass}`}>{rankBadge}</div>
                    <div className="top-book-info">
                      <div className="top-book-title" title={book.title}>
                        {book.title}
                      </div>
                      <div className="top-book-track">
                        <div className="top-book-bar" style={{ width: `${barWidth}%` }} />
                      </div>
                    </div>
                    <div className="top-book-count">{book.count} lượt</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          5. BẢNG CẢNH BÁO QUÁ HẠN CHI TIẾT & NHẬT KÝ GIAO DỊCH
          ======================================================== */}
      <div className="dash-ops-grid">
        {/* Panel Trái: Danh sách quá hạn thu hồi (Staff/Admin) hoặc Sách tôi đang mượn (Độc giả) / Sách mới nhập kho */}
        <div className="dash-panel">
          <div className="dash-panel-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
            {/* Sliding Pill Segmented Tabs (Lucian UX/UI Prompt #039) */}
            <div className="sliding-tabs-nav">
              <button
                type="button"
                className={`sliding-tab-btn ${activeOpsTab === 'primary' ? 'is-active' : ''}`}
                onClick={() => setActiveOpsTab('primary')}
              >
                <span>{canApproveBorrow ? '🚨 Quá hạn thu hồi' : '📖 Sách đang giữ'}</span>
                <span className={`sliding-tab-count ${canApproveBorrow && overdueList.length > 0 ? 'alert' : ''}`}>
                  {canApproveBorrow ? overdueList.length : myActiveBooks.length}
                </span>
              </button>
              <button
                type="button"
                className={`sliding-tab-btn ${activeOpsTab === 'newBooks' ? 'is-active' : ''}`}
                onClick={() => setActiveOpsTab('newBooks')}
              >
                <span>✨ Sách mới nhập kho</span>
                <span className="sliding-tab-count">{newBooks.length}</span>
              </button>
            </div>

            <Link
              to={activeOpsTab === 'primary' ? (canApproveBorrow ? '/borrow-management' : '/return') : '/books'}
              style={{ fontSize: '14.5px', color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}
            >
              {activeOpsTab === 'primary'
                ? (canApproveBorrow ? 'Quản lý mượn trả →' : 'Xem chi tiết tủ sách →')
                : 'Xem tất cả kho sách →'}
            </Link>
          </div>

          {activeOpsTab === 'newBooks' ? (
            newBooks.length === 0 ? (
              <div className="dash-empty-state">
                <div className="dash-empty-icon">📚</div>
                <h4>Chưa có sách mới</h4>
                <p>Kho sách thư viện hiện đang được cập nhật.</p>
              </div>
            ) : (
              <div className="dash-overdue-list">
                {newBooks.map((item) => (
                  <div key={item.id} className="dash-overdue-item" style={{ borderLeftColor: '#4f46e5' }}>
                    <div className="dash-overdue-meta">
                      <strong>{item.title}</strong>
                      <span>
                        ✍️ Tác giả: <strong>{item.authors || 'Đang cập nhật'}</strong> &bull; Thể loại: <strong>{item.categoryName || 'Sách tổng hợp'}</strong>
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        background: (item.quantity || 0) > 0 ? '#ecfdf5' : '#fef2f2',
                        color: (item.quantity || 0) > 0 ? '#047857' : '#b91c1c',
                        border: `1px solid ${(item.quantity || 0) > 0 ? '#a7f3d0' : '#fecaca'}`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {(item.quantity || 0) > 0 ? `Còn ${item.quantity} cuốn` : 'Tạm hết'}
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : canApproveBorrow ? (
            /* Chế độ Staff/Admin: Xem sách quá hạn */
            overdueList.length === 0 ? (
              <div className="dash-empty-state">
                <div className="dash-empty-icon">🎉</div>
                <h4>Không có sách quá hạn!</h4>
                <p>Thật tuyệt vời! Toàn bộ bạn đọc đều hoàn trả sách đúng kỳ hạn quy định.</p>
              </div>
            ) : (
              <div className="dash-overdue-list">
                {overdueList.map((item) => (
                  <div key={item.id} className="dash-overdue-item">
                    <div className="dash-overdue-meta">
                      <strong>{item.bookTitle}</strong>
                      <span>
                        👤 Độc giả: <strong>{item.memberName}</strong> &bull; Hạn trả:{' '}
                        <strong>{formatDateVN(item.dueDate)}</strong>
                      </span>
                    </div>
                    <span className="dash-overdue-badge">
                      Trễ {item.overdueDays || 1} ngày
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Chế độ Độc giả: Xem sách đang mượn & Hạn trả */
            myActiveBooks.length === 0 ? (
              <div className="dash-empty-state">
                <div className="dash-empty-icon">📚</div>
                <h4>Bạn chưa mượn cuốn sách nào</h4>
                <p>Hãy khám phá kho sách phong phú và chọn cho mình cuốn sách yêu thích ngay!</p>
                <Link
                  to="/books"
                  style={{
                    marginTop: '12px',
                    display: 'inline-flex',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#4f46e5',
                    color: '#ffffff',
                    fontSize: '15px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Khám phá kho sách &rarr;
                </Link>
              </div>
            ) : (
              <div className="dash-overdue-list">
                {myActiveBooks.map((item) => (
                  <div key={item.id} className="dash-overdue-item">
                    <div className="dash-overdue-meta">
                      <strong>{item.bookTitle}</strong>
                      <span>
                        Mượn ngày: {formatDateVN(item.borrowDate)} &bull; Hạn trả:{' '}
                        <strong>{formatDateVN(item.dueDate)}</strong>
                      </span>
                    </div>
                    {item.isOverdue ? (
                      <span className="dash-overdue-badge">
                        Quá hạn {item.overdueDays || 1} ngày
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          background: '#ecfdf5',
                          color: '#047857',
                          border: '1px solid #a7f3d0',
                        }}
                      >
                        Còn hạn
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Panel Phải: Nhật ký giao dịch gần đây */}
        <div className="dash-panel">
          <div className="dash-panel-header">
            <h3 className="dash-panel-title">
              <span className="icon">🕒</span>
              Hoạt động giao dịch gần đây
            </h3>
            <Link
              to={canApproveBorrow ? '/borrow-management' : '/return'}
              style={{ fontSize: '14.5px', color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}
            >
              Lịch sử đầy đủ &rarr;
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <div className="dash-empty-state">
              <div className="dash-empty-icon">📋</div>
              <h4>Chưa có hoạt động nào</h4>
              <p>Các giao dịch mượn và hoàn trả sách sẽ tự động được ghi nhận tại đây.</p>
            </div>
          ) : (
            <div className="dash-activity-list">
              {recentActivity.map((item) => (
                <div key={item.id} className="dash-activity-item">
                  <div className="dash-activity-avatar">
                    {(item.memberName || user.username || 'B').charAt(0).toUpperCase()}
                  </div>
                  <div className="dash-activity-info">
                    <div className="dash-activity-text">
                      <strong>{item.memberName || user.username}</strong> —{' '}
                      <em>{item.bookTitle}</em>
                    </div>
                    <div className="dash-activity-date">
                      Ngày mượn: {formatDateVN(item.borrowDate)}{' '}
                      {item.returnDate && `• Ngày trả: ${formatDateVN(item.returnDate)}`}
                    </div>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          6. TRUY CẬP NHANH (QUICK ACTIONS HUB)
          ======================================================== */}
      <section className="quick-section">
        <div className="section-title">
          <h2>Truy cập nhanh chức năng</h2>
          <p>Các tác vụ thông dụng được tối ưu hóa riêng theo quyền tài khoản của bạn</p>
        </div>

        <div className="quick-grid">
          {/* 1. Tra cứu sách - BOOK_VIEW */}
          {canViewBooks && !canManageBooks && (
            <Link to="/books" className="quick-card">
              <div className="quick-icon">📖</div>
              <div className="quick-card-body">
                <h3>Tra cứu sách</h3>
                <p>Tìm kiếm đầu sách, tra cứu tình trạng còn/hết và gửi yêu cầu mượn.</p>
              </div>
              <span className="quick-arrow">&rarr;</span>
            </Link>
          )}

          {/* 2. Quản lý kho sách - Staff/Admin có CRUD */}
          {canManageBooks && (
            <Link to="/books/manage" className="quick-card">
              <div className="quick-icon">📚</div>
              <div className="quick-card-body">
                <h3>Quản lý kho sách</h3>
                <p>Thêm mới sách, sửa xóa, nhập dữ liệu hàng loạt từ tệp CSV và kiểm kê kho.</p>
              </div>
              <span className="quick-arrow">&rarr;</span>
            </Link>
          )}

          {/* 3. Mượn sách - BORROW_BOOK */}
          {canBorrow && (
            <Link to="/borrow" className="quick-card">
              <div className="quick-icon">📤</div>
              <div className="quick-card-body">
                <h3>Đăng ký mượn sách</h3>
                <p>Chọn các cuốn sách yêu thích từ kho và gửi yêu cầu mượn đến thư viện.</p>
              </div>
              <span className="quick-arrow">&rarr;</span>
            </Link>
          )}

          {/* 4. Sách của tôi - BORROW_BOOK hoặc RETURN_BOOK */}
          {(canBorrow || canReturn) && (
            <Link to="/return" className="quick-card">
              <div className="quick-icon">📥</div>
              <div className="quick-card-body">
                <h3>Tủ sách & Hoàn trả</h3>
                <p>Theo dõi hạn trả 14 ngày, kiểm tra sách quá hạn và gửi yêu cầu hoàn trả.</p>
              </div>
              <span className="quick-arrow">&rarr;</span>
            </Link>
          )}

          {/* 5. Quản lý thành viên - MEMBER_VIEW */}
          {canViewMembers && (
            <Link to="/members" className="quick-card">
              <div className="quick-icon">👥</div>
              <div className="quick-card-body">
                <h3>Quản lý thành viên</h3>
                <p>Tra cứu hồ sơ độc giả, cấp tài khoản và quản lý thông tin thành viên.</p>
              </div>
              <span className="quick-arrow">&rarr;</span>
            </Link>
          )}

          {/* 6. Quản lý mượn / trả - BORROW_APPROVE hoặc RETURN_CONFIRM */}
          {canManageBorrow && (
            <Link to="/borrow-management" className="quick-card">
              <div className="quick-icon">📋</div>
              <div className="quick-card-body">
                <h3>Xét duyệt mượn / trả</h3>
                <p>Phê duyệt yêu cầu mượn mới, thu hồi sách quá hạn và xác nhận nhận lại sách.</p>
              </div>
              <span className="quick-arrow">&rarr;</span>
            </Link>
          )}

          {/* 7. Phân quyền tài khoản - SYSTEM_MAINTENANCE */}
          {canSystemConfig && (
            <Link to="/roles" className="quick-card">
              <div className="quick-icon">🛡️</div>
              <div className="quick-card-body">
                <h3>Phân quyền tài khoản</h3>
                <p>Quản trị viên phân bổ nhóm quyền Admin, Thủ thư, Độc giả cho các tài khoản.</p>
              </div>
              <span className="quick-arrow">&rarr;</span>
            </Link>
          )}

          {/* 8. Cấu hình hệ thống - SYSTEM_MAINTENANCE */}
          {canSystemConfig && (
            <Link to="/system-config" className="quick-card">
              <div className="quick-icon">⚙️</div>
              <div className="quick-card-body">
                <h3>Cấu hình hệ thống</h3>
                <p>Giám sát trạng thái hoạt động và kích hoạt chế độ bảo trì toàn hệ thống.</p>
              </div>
              <span className="quick-arrow">&rarr;</span>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
