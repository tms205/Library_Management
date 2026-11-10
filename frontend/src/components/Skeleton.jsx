import '../styles/skeleton.css';

export function SkeletonText({ width = '100%', height = '14px', className = '' }) {
  return (
    <span
      className={`skeleton-shimmer ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="skeleton-table-wrapper" aria-hidden="true">
      <table className="skeleton-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <span
                  className="skeleton-shimmer"
                  style={{ width: `${60 + (i % 3) * 20}%`, height: '14px' }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <span
                    className="skeleton-shimmer"
                    style={{
                      width: c === 0 ? '40%' : c === 1 ? '85%' : '65%',
                      height: '14px',
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonBookCardGrid({ count = 8 }) {
  return (
    <div className="skeleton-books-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-book-card">
          <div className="skeleton-shimmer skeleton-cover" />
          <div className="skeleton-card-body">
            <span className="skeleton-shimmer skeleton-line title" />
            <span className="skeleton-shimmer skeleton-line sub" />
            <span className="skeleton-shimmer skeleton-line btn" />
          </div>
        </div>
      ))}
    </div>
  );
}
