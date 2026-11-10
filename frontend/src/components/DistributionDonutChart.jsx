import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, PieChart } from 'lucide-react';

// Hàm tính tọa độ path hình vành khăn (Donut Arc) cho SVG
function createDonutPath(cx, cy, innerR, outerR, startAngle, endAngle) {
  const angleDelta = endAngle - startAngle;

  // Nếu là vòng tròn hoàn chỉnh (100% một trạng thái duy nhất)
  if (angleDelta >= 2 * Math.PI - 0.001) {
    const midAngle = startAngle + Math.PI;
    return `${createDonutPath(cx, cy, innerR, outerR, startAngle, midAngle)} ${createDonutPath(
      cx,
      cy,
      innerR,
      outerR,
      midAngle,
      endAngle,
    )}`;
  }

  const x1 = cx + outerR * Math.cos(startAngle);
  const y1 = cy + outerR * Math.sin(startAngle);
  const x2 = cx + outerR * Math.cos(endAngle);
  const y2 = cy + outerR * Math.sin(endAngle);

  const x3 = cx + innerR * Math.cos(endAngle);
  const y3 = cy + innerR * Math.sin(endAngle);
  const x4 = cx + innerR * Math.cos(startAngle);
  const y4 = cy + innerR * Math.sin(startAngle);

  const largeArcFlag = angleDelta > Math.PI ? 1 : 0;

  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2.toFixed(
    2,
  )} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4.toFixed(
    2,
  )} ${y4.toFixed(2)} Z`;
}

export default function DistributionDonutChart({ counts = [], total = 0, loading = false }) {
  const [hoveredStatus, setHoveredStatus] = useState(null);

  // Lọc các trạng thái có dữ liệu > 0 để vẽ biểu đồ tròn
  const activeSlices = counts.filter((item) => item.count > 0);

  // Kích thước SVG
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 80;
  const innerR = 52;
  // Tính toán góc cho từng múi biểu đồ
  let currentAngle = -Math.PI / 2; // Bắt đầu từ góc 12 giờ
  const slicesWithAngles = activeSlices.map((item) => {
    const sliceAngle = (item.count / (total || 1)) * (2 * Math.PI);
    const effectiveGap = activeSlices.length > 1 ? Math.min(0.04, sliceAngle * 0.2) : 0;
    const startAngle = currentAngle + effectiveGap / 2;
    const endAngle = currentAngle + sliceAngle - effectiveGap / 2;
    const midAngle = (startAngle + endAngle) / 2;

    currentAngle += sliceAngle;

    // Vector đẩy múi nổi lên khi hover
    const popDistance = 8;
    const popX = Math.cos(midAngle) * popDistance;
    const popY = Math.sin(midAngle) * popDistance;

    const pathData = createDonutPath(cx, cy, innerR, outerR, startAngle, endAngle);

    return {
      ...item,
      startAngle,
      endAngle,
      midAngle,
      popX,
      popY,
      pathData,
      percentage: total > 0 ? ((item.count / total) * 100).toFixed(1) : '0',
    };
  });

  const activeHoveredItem = slicesWithAngles.find((s) => s.status === hoveredStatus);

  return (
    <div className="donut-distribution-card">
      {/* Vùng Biểu đồ tròn SVG */}
      <div className="donut-chart-wrapper" style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '16px 0 10px' }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ overflow: 'visible' }}
          role="img"
          aria-label="Biểu đồ phân bổ phiếu mượn"
        >
          {loading || total === 0 ? (
            // Vòng tròn rỗng khi chưa có dữ liệu
            <circle
              cx={cx}
              cy={cy}
              r={(outerR + innerR) / 2}
              fill="none"
              stroke="var(--border-light)"
              strokeWidth={outerR - innerR}
              strokeDasharray="6 6"
              opacity={0.6}
            />
          ) : (
            [...slicesWithAngles]
              .sort((a, b) => (a.status === hoveredStatus ? 1 : b.status === hoveredStatus ? -1 : 0))
              .map((slice) => {
              const isHovered = hoveredStatus === slice.status;
              return (
                <path
                  key={slice.status}
                  d={slice.pathData}
                  fill={slice.color}
                  onMouseEnter={() => setHoveredStatus(slice.status)}
                  onMouseLeave={() => setHoveredStatus(null)}
                  style={{
                    transform: isHovered ? `translate(${slice.popX.toFixed(2)}px, ${slice.popY.toFixed(2)}px)` : 'translate(0px, 0px)',
                    transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.25s ease, opacity 0.2s ease',
                    cursor: 'pointer',
                    filter: isHovered
                      ? `drop-shadow(0 6px 12px ${slice.color}66) brightness(1.15)`
                      : 'none',
                    opacity: hoveredStatus && !isHovered ? 0.65 : 1,
                  }}
                />
              );
            })
          )}
        </svg>

        {/* Nội dung tương tác ở tâm biểu đồ Donut */}
        <div
          className="donut-center-info"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: innerR * 2,
            height: innerR * 2,
            borderRadius: '50%',
          }}
        >
          {loading ? (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Đang tải...</span>
          ) : activeHoveredItem ? (
            <>
              <span style={{ fontSize: '20px', fontWeight: 800, color: activeHoveredItem.color, lineHeight: 1 }}>
                {activeHoveredItem.count}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '3px' }}>
                {activeHoveredItem.label}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {activeHoveredItem.percentage}%
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {total}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Tổng phiếu
              </span>
            </>
          )}
        </div>
      </div>

      {/* Danh sách chỉ mục (Legend / Breakdown List) với hover liên kết */}
      <div className="donut-legend-list" style={{ padding: '4px 20px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {counts.map((item) => {
          const isHovered = hoveredStatus === item.status;
          const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0';

          return (
            <div
              key={item.status}
              className={`donut-legend-row ${isHovered ? 'is-hovered' : ''}`}
              onMouseEnter={() => setHoveredStatus(item.status)}
              onMouseLeave={() => setHoveredStatus(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isHovered ? 'var(--bg-surface-elevated)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: item.color,
                    flexShrink: 0,
                    boxShadow: isHovered ? `0 0 8px ${item.color}` : 'none',
                    transition: 'box-shadow 0.2s ease',
                  }}
                />
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: isHovered ? 600 : 500,
                    color: isHovered ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {item.label}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {percentage}%
                </span>
                <strong
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: isHovered ? item.color : 'var(--text-primary)',
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: '22px',
                    textAlign: 'right',
                  }}
                >
                  {item.count}
                </strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* Link xem chi tiết */}
      <Link
        to="/borrow-management"
        className="panel-footer-link"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          fontSize: '12px',
          color: 'var(--primary-accent)',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        <span>Chi tiết mượn trả</span>
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
