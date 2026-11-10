import { useEffect, useState } from 'react';
import { Search, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchBooks } from '../api/bookApi';
import { errorMessage } from '../utils/errors';

export default function ReaderSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);
  const term = query.trim();
  useEffect(() => {
    if (!open || term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await searchBooks({ title: term, page: 0, size: 5 }, { signal: controller.signal });
        if (!controller.signal.aborted) setResult({ term, revision, books: response.data?.content || [] });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ term, revision, error: errorMessage(error) });
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, term, revision]);
  const current = result?.term === term && result?.revision === revision ? result : null;
  function submit(title) { setOpen(false); navigate(title ? `/books?title=${encodeURIComponent(title)}` : '/books'); }
  return <div className="reader-search-box" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}><form onSubmit={(e) => { e.preventDefault(); submit(term); }}><Search size={17} /><input type="search" aria-label="Tìm kiếm theo tên sách" placeholder="Bạn muốn đọc gì hôm nay?" value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} /><button type="submit">Tìm sách</button></form>{open && term.length >= 2 && <div className="reader-search-results">{!current ? <p role="status">Đang tìm sách…</p> : current.error ? <div><p role="alert">{current.error}</p><button type="button" className="btn btn-outline" onClick={() => setRevision((v) => v + 1)}>Thử lại</button></div> : current.books.length ? current.books.map((b) => <button type="button" key={b.id} onClick={() => submit(b.title)}><BookOpen size={17} /><span><strong>{b.title}</strong><small>{b.authorNames?.join(', ') || 'Chưa cập nhật tác giả'}</small></span><span>{b.quantity > 0 ? `Còn ${b.quantity} cuốn` : 'Hết sách'}</span></button>) : <p role="status">Không tìm thấy sách theo tên này.</p>}</div>}</div>;
}
