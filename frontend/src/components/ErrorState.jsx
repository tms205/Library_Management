import { AlertCircle, RotateCw } from 'lucide-react';
export default function ErrorState({ message = 'Không thể tải dữ liệu. Vui lòng thử lại.', onRetry }) {
  return <div className="error-state" role="alert"><span className="error-state-icon"><AlertCircle size={24} /></span><h3>Chưa thể kết nối dữ liệu</h3><p>{message}</p>{onRetry && <button type="button" className="btn btn-outline" onClick={onRetry}><RotateCw size={15} />Thử lại</button>}</div>;
}
