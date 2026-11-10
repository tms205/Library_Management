import { useState } from 'react';
import { ArrowUpRight, Pencil, Trash2, Check, Plus } from 'lucide-react';
import BookCover from './BookCover';
import BookDetails from './BookDetails';
export default function BookCard({ book, onBorrow, onEdit, onDelete, canBorrow = false, canEdit = false, canDelete = false, isSelected = false, onToggleSelect, selectable = false }) {
  const [details, setDetails] = useState(false);
  const inStock = Number(book.quantity) > 0;
  const authors = Array.isArray(book.authorNames) ? book.authorNames.join(', ') : '';
  return <article className={`clean-book-card ${isSelected ? 'selected' : ''}`}>
    <div className="book-card-cover"><button type="button" className="cover-open" aria-label={`Xem chi tiết ${book.title}`} onClick={() => setDetails(true)}><BookCover book={book} /></button>{selectable && <button type="button" className={`card-select-btn ${isSelected ? 'active' : ''}`} aria-label={`${isSelected ? 'Bỏ chọn' : 'Chọn'} ${book.title}`} aria-pressed={isSelected} onClick={() => onToggleSelect?.(book.id)}>{isSelected ? <Check size={15} /> : <Plus size={15} />}</button>}</div>
    <div className="card-content"><span className={`card-stock ${inStock ? 'in-stock' : ''}`}>{inStock ? `Sẵn có · ${book.quantity} cuốn` : 'Tạm hết sách'}</span><h3 className="card-title"><button type="button" onClick={() => setDetails(true)}>{book.title}</button></h3><p className="card-author">{authors || 'Chưa cập nhật tác giả'}</p><div className="card-actions">{canBorrow && inStock && onBorrow && <button type="button" className="btn-card-borrow" onClick={() => onBorrow(book)}>Đăng ký mượn <ArrowUpRight size={14} /></button>}{canEdit && onEdit && <button type="button" className="btn-card-edit" onClick={() => onEdit(book)}><Pencil size={12} />Sửa</button>}{canDelete && onDelete && <button type="button" className="btn-card-delete" onClick={() => onDelete(book)}><Trash2 size={12} />Xóa</button>}</div></div><BookDetails book={details ? book : null} onClose={() => setDetails(false)} canBorrow={canBorrow} /></article>;
}
