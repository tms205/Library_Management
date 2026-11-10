import BookStage from '../components/BookStage';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, ArrowUpRight, ArrowRight, Clock, BookmarkCheck } from 'lucide-react';
import { searchBooks } from '../api/bookApi';
import { getMyBorrowedBooks } from '../api/borrowApi';
import { getUserInfo, hasPermission } from '../utils/auth';
import useResource from '../hooks/useResource';
import BookCard from '../components/BookCard';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { SkeletonBookCardGrid } from '../components/Skeleton';
const loadBooks = async () => hasPermission('BOOK_VIEW') ? (await searchBooks({ page: 0, size: 8, sortBy: 'id', direction: 'desc' })).data : null;
const loadLoans = async () => hasPermission('BORROW_BOOK') ? (await getMyBorrowedBooks()).data : [];
export default function UserDashboard() {
  const user = getUserInfo();
  const navigate = useNavigate();
  const catalog = useResource(loadBooks);
  const loans = useResource(loadLoans);
  const books = catalog.data?.content || [];
  const active = (loans.data || []).filter((r) => ['BORROWED', 'RETURN_PENDING'].includes(r.status));
  return <div className="discovery-page"><section className="discovery-hero"><div className="discovery-copy"><span className="eyebrow">CHÀO {user.username.toUpperCase()} · CHÀO MỘT NGÀY MỚI</span><h1>Cuốn sách tiếp theo.<br /><em>Một thế giới mới.</em></h1><p>Dành một chút thời gian cho điều bạn muốn biết.<br />Tìm cuốn sách đồng hành cùng bạn hôm nay.</p>{hasPermission('BOOK_VIEW') && <Link className="btn btn-primary" to="/books">Khám phá thư viện <ArrowUpRight size={16} /></Link>}</div><BookStage /></section>{hasPermission('BORROW_BOOK') && <section className="reading-strip"><div><BookmarkCheck size={21} /><span><strong>Tủ sách của {user.username}</strong><small>{loans.loading ? 'Đang tải thông tin mượn sách…' : loans.error ? 'Chưa tải được thông tin mượn sách.' : active.length ? `Bạn có ${active.length} cuốn đang mượn hoặc chờ xác nhận trả.` : 'Hành trình đọc mới bắt đầu từ một cuốn sách.'}</small></span></div><Link to="/my-books">Xem tủ sách <ArrowRight size={15} /></Link></section>}{loans.error && hasPermission('BORROW_BOOK') && <ErrorState message={loans.error} onRetry={loans.reload} />}{active.length > 0 && <section className="reader-loan-grid">{active.slice(0,3).map((r) => <Link to="/my-books" key={r.id} className="reader-loan"><BookOpen size={19} /><div><strong>{r.bookTitle}</strong><small className={r.isOverdue ? 'text-danger' : ''}><Clock size={12} />{r.isOverdue ? `Quá hạn ${r.overdueDays} ngày` : `Hạn trả: ${r.dueDate || 'Chưa có'}`}</small></div><ArrowUpRight size={16} /></Link>)}</section>}{hasPermission('BOOK_VIEW') && <section className="discovery-section"><div className="section-heading"><div><span className="eyebrow">TRÊN KỆ SÁCH</span><h2>Mới đến thư viện</h2></div><Link to="/books">Tất cả đầu sách <ArrowRight size={15} /></Link></div>{catalog.loading ? <SkeletonBookCardGrid count={4} /> : catalog.error ? <ErrorState message={catalog.error} onRetry={catalog.reload} /> : !books.length ? <EmptyState icon={BookOpen} title="Chưa có đầu sách nào" description="Các đầu sách sẽ xuất hiện tại đây khi được thư viện cập nhật." /> : <div className="discovery-books">{books.map((book) => <BookCard key={book.id} book={book} canBorrow={hasPermission('BORROW_BOOK')} onBorrow={() => navigate(`/borrow?title=${encodeURIComponent(book.title)}`)} />)}</div>}</section>}</div>;
}
