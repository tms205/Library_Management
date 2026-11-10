import { Link } from 'react-router-dom';
import { BookOpen, ArrowLeft } from 'lucide-react';
export default function NotFound() { return <main className="not-found"><span className="eyebrow">404 · KHÔNG TÌM THẤY TRANG</span><BookOpen size={44} strokeWidth={1.3} /><h1>Trang sách này chưa được viết.</h1><p>Đường dẫn có thể đã thay đổi. Hãy trở về thư viện để tiếp tục.</p><Link to="/dashboard" className="btn btn-primary"><ArrowLeft size={16} />Về thư viện</Link></main>; }
