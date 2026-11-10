import { BookOpen } from 'lucide-react';
export default function Brand({ compact = false }) {
  return <span className="library-brand"><span className="library-mark"><BookOpen size={23} strokeWidth={1.7} /></span>{!compact && <span><strong>aura<span className="brand-period">.</span></strong><small>KHÔNG GIAN TRI THỨC</small></span>}</span>;
}
