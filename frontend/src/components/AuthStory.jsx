import { ArrowUpRight } from 'lucide-react';
import Brand from './Brand';
import BookStage from './BookStage';
export default function AuthStory() {
  return <><aside className="auth-story"><Brand /><div className="auth-story-copy"><span className="eyebrow">MỖI TRANG SÁCH, MỘT KHỞI ĐẦU</span><h2>Mở một cuốn sách.<br />Mở thêm một<br /><em>chân trời.</em></h2><p>Không gian dành cho sự tò mò, những ý tưởng mới và hành trình đọc của riêng bạn.</p><BookStage /></div><div className="auth-story-footer"><span>Aura Library</span><span>Đọc để đi xa hơn <ArrowUpRight size={14} /></span></div></aside><details className="auth-mobile-scene"><summary>Khám phá cảnh sách 3D</summary><BookStage /></details></>;
}
