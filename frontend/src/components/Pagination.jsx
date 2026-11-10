import { ChevronLeft, ChevronRight } from 'lucide-react';
import '../styles/pagination.css';

export default function Pagination({
  page = 0, // 0-indexed
  totalPages = 1,
  totalElements,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}) {
  if (totalPages <= 1 && (!totalElements || totalElements <= pageSize)) {
    return null;
  }

  // Calculate visible range of items (e.g. 1 - 10 of 42)
  const startItem = totalElements === 0 ? 0 : page * pageSize + 1;
  const endItem =
    totalElements !== undefined
      ? Math.min((page + 1) * pageSize, totalElements)
      : (page + 1) * pageSize;

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0); // First page

      let start = Math.max(1, page - 1);
      let end = Math.min(totalPages - 2, page + 1);

      if (page <= 2) {
        start = 1;
        end = 3;
      } else if (page >= totalPages - 3) {
        start = totalPages - 4;
        end = totalPages - 2;
      }

      if (start > 1) {
        pages.push('ellipsis-start');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 2) {
        pages.push('ellipsis-end');
      }

      pages.push(totalPages - 1); // Last page
    }

    return pages;
  };

  return (
    <div className="pagination-strip" role="navigation" aria-label="Phân trang dữ liệu">
      <div className="pagination-info">
        {totalElements !== undefined ? (
          <span>
            Hiển thị <strong>{startItem} - {endItem}</strong> trên tổng số <strong>{totalElements}</strong> kết quả
          </span>
        ) : (
          <span>
            Trang <strong>{page + 1}</strong> trên <strong>{totalPages}</strong>
          </span>
        )}

        {onPageSizeChange && (
          <select
            className="pagination-size-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Số bản ghi mỗi trang"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} dòng/trang
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-btn"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft size={16} />
        </button>

        {getPageNumbers().map((p, idx) => {
          if (p === 'ellipsis-start' || p === 'ellipsis-end') {
            return (
              <span key={`el-${idx}`} className="pagination-ellipsis">
                &hellip;
              </span>
            );
          }

          const pageNum = Number(p);
          const isActive = pageNum === page;

          return (
            <button
              key={pageNum}
              type="button"
              className={`pagination-btn ${isActive ? 'active' : ''}`}
              onClick={() => onPageChange(pageNum)}
              aria-current={isActive ? 'page' : undefined}
            >
              {pageNum + 1}
            </button>
          );
        })}

        <button
          type="button"
          className="pagination-btn"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          aria-label="Trang sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
