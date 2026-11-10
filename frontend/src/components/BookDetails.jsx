import { X, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Modal from './Modal';
import BookCover from './BookCover';
export default function BookDetails({ book, onClose, canBorrow = false }) {
  if (!book) return null;
  return <Modal onClose={onClose} labelledBy="book-detail-title" className="book-detail-dialog"><div className="gt-modal-header"><span className="eyebrow">THÔNG TIN ĐẦU SÁCH</span><button type="button" className="icon-button" aria-label="Đóng chi tiết sách" onClick={onClose}><X size={18} /></button></div><div className="book-detail-body"><BookCover book={book} /><div><h2 id="book-detail-title">{book.title}</h2><p>{book.authorNames?.length ? book.authorNames.join(', ') : 'Chưa cập nhật tác giả'}</p><dl><div><dt>Mã sách</dt><dd>#{book.id}</dd></div><div><dt>ISBN</dt><dd>{book.isbn || '—'}</dd></div><div><dt>Ngày xuất bản</dt><dd>{book.publishedDate || '—'}</dd></div><div><dt>Sẵn có trong kho</dt><dd>{book.quantity ?? '—'} cuốn</dd></div></dl><span className={`badge-clean ${book.quantity > 0 ? 'badge-success' : 'badge-neutral'}`}>{book.quantity > 0 ? 'Có thể đăng ký mượn' : 'Hiện đã hết sách'}</span>{canBorrow && book.quantity > 0 && <Link to={`/borrow?title=${encodeURIComponent(book.title)}`} className="btn btn-primary" onClick={onClose}>Đăng ký mượn <ArrowUpRight size={15} /></Link>}</div></div></Modal>;
}
