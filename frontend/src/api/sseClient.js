import { API_BASE_URL } from './config';
import { getAccessToken } from '../utils/auth';
import { refreshAccessToken } from './axiosClient';

/**
 * Fetch-based Server-Sent Events (SSE) Client
 * - Gửi JWT token qua Header "Authorization: Bearer <token>" (Bảo mật tuyệt đối, không lộ qua URL query)
 * - Tự động reconnect với Exponential Backoff khi mất mạng
 * - Tự động refresh token khi gặp HTTP 401
 * - Hỗ trợ lọc heartbeat comments (:heartbeat)
 */
export function createSseSubscription({
  url = `${API_BASE_URL}/api/notifications/stream`,
  onMessage = () => {},
  onError = () => {},
  onOpen = () => {},
}) {
  let isAborted = false;
  let abortController = new AbortController();
  let retryTimeout = null;
  let retryCount = 0;

  const connect = async () => {
    if (isAborted) return;

    let token = getAccessToken();
    if (!token) {
      logInfo('Không có access token để kết nối SSE.');
      return;
    }

    try {
      abortController = new AbortController();

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        signal: abortController.signal,
      });

      // Nếu token hết hạn (401), chủ động refresh token và thử lại ngay
      if (response.status === 401) {
        logInfo('SSE nhận 401 Unauthorized, đang tự động refresh token...');
        try {
          token = await refreshAccessToken();
          if (token && !isAborted) {
            connect();
            return;
          }
        } catch {
          logInfo('Refresh token thất bại, dừng kết nối SSE.');
          onError(new Error('Phiên đăng nhập đã hết hạn'));
          return;
        }
      }

      if (!response.ok) {
        throw new Error(`SSE kết nối thất bại với mã trạng thái: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream không được trình duyệt hỗ trợ.');
      }

      retryCount = 0; // Đặt lại số lần retry khi kết nối thành công
      onOpen();

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (!isAborted) {
        const { value, done } = await reader.read();
        if (done) {
          logInfo('SSE Stream đã đóng bởi máy chủ.');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r\n|\r|\n/);
        buffer = lines.pop() || ''; // Giữ lại phần chưa đủ 1 dòng hoàn chỉnh

        let eventName = 'message';
        let eventData = '';
        let eventId = '';

        for (const line of lines) {
          if (line.startsWith(':')) {
            // Heartbeat comment, bỏ qua hoặc ghi log keep-alive
            continue;
          }
          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            eventData += (eventData ? '\n' : '') + line.slice(5).trim();
          } else if (line.startsWith('id:')) {
            eventId = line.slice(3).trim();
          } else if (line === '') {
            // Hết 1 block SSE event
            if (eventData) {
              try {
                const parsed = JSON.parse(eventData);
                if (eventName === 'BOOK_INVENTORY_CHANGED' && typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('book-inventory-changed', { detail: parsed }));
                }
                onMessage({ event: eventName, data: parsed, id: eventId });
              } catch {
                onMessage({ event: eventName, data: eventData, id: eventId });
              }
            }
            eventName = 'message';
            eventData = '';
            eventId = '';
          }
        }
      }
    } catch (err) {
      if (isAborted) return;
      onError(err);
    }

    // Nếu bị ngắt kết nối mà không phải do chủ động abort, tự động kết nối lại
    if (!isAborted) {
      retryCount++;
      const delay = Math.min(1000 * Math.pow(1.5, retryCount), 30000);
      retryTimeout = setTimeout(() => {
        connect();
      }, delay);
    }
  };

  const logInfo = (msg) => {
    if (import.meta.env.DEV) {
      console.log(`[SSE] ${msg}`);
    }
  };

  // Bắt đầu kết nối
  connect();

  // Trả về hàm hủy để clean up khi component unmount hoặc logout
  return {
    abort: () => {
      isAborted = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (abortController) abortController.abort();
    },
  };
}
