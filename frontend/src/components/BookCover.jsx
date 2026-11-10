import { useState } from 'react';
import { BookOpen } from 'lucide-react';
export default function BookCover({ book, small = false }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const image = book.image && failedUrl !== book.image;
  return <div className={`book-cover ${small ? 'book-cover-small' : ''} cover-tone-${Math.abs(Number(book.id) || 0)%4}`}>{image ? <img src={book.image} alt={`Bìa sách ${book.title}`} loading="lazy" onError={() => setFailedUrl(book.image)} /> : <div className="book-cover-design"><span className="cover-edition">AURA / THƯ VIỆN</span><BookOpen size={22} strokeWidth={1.2} /><strong>{book.title}</strong><span className="cover-rule" /></div>}</div>;
}
