import { useEffect, useId, useRef, useState } from 'react';
import { BookOpen, Box, Move, Plus, Minus, RotateCcw } from 'lucide-react';
import '../styles/cinematic.css';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function BookStage({ compact = false, isLogin = false }) {
  const canvasRef = useRef(null);
  
  // Phóng to hơn 20% cho tất cả các trang TRỪ trang đăng nhập (zoom 1.20 thay vì 1.0)
  const defaultZoom = isLogin ? 1.0 : 1.20;
  const home = { yaw: -0.12, pitch: 0.14, zoom: defaultZoom };

  const target = useRef({ ...home });
  const hoverOffset = useRef({ yaw: 0, pitch: 0 });
  const isHovered = useRef(false);
  const idleTick = useRef(0);
  const requestDraw = useRef(null);
  const gesture = useRef(null);
  const [ready, setReady] = useState(false);
  const helpId = useId();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let cancelled = false;
    let visible = false;
    let initializing = false;
    let frame = 0;
    let scene;
    let current = { ...home };

    function schedule() {
      if (!frame && scene && visible) frame = requestAnimationFrame(draw);
    }

    function draw() {
      frame = 0;
      if (!scene || !visible) return;

      // Tính góc mục tiêu thực tế: kết hợp góc cơ sở + góc di chuyển chuột (Hover) hoặc tự xoay nhẹ (Idle Float)
      let targetYaw = target.current.yaw;
      let targetPitch = target.current.pitch;
      const targetZoom = target.current.zoom;

      if (isHovered.current) {
        // Chuyển động tương tác lập tức theo vị trí con trỏ chuột
        targetYaw += hoverOffset.current.yaw;
        targetPitch = clamp(targetPitch + hoverOffset.current.pitch, -0.48, 0.62);
      } else if (!motion.matches) {
        // Tự động xoay chuyển động nhẹ nhàng khi ở trạng thái nghỉ
        idleTick.current += 0.01;
        targetYaw += Math.sin(idleTick.current) * 0.07;
        targetPitch = clamp(targetPitch + Math.cos(idleTick.current * 0.7) * 0.03, -0.48, 0.62);
      }

      let moving = false;
      const dest = { yaw: targetYaw, pitch: targetPitch, zoom: targetZoom };
      for (const key of ['yaw', 'pitch', 'zoom']) {
        const diff = dest[key] - current[key];
        if (motion.matches || Math.abs(diff) < 0.0006) {
          current[key] = dest[key];
        } else {
          current[key] += diff * 0.22;
          moving = true;
        }
      }

      scene.draw(current.yaw, current.pitch, current.zoom);

      // Luôn duy trì vòng lặp animation mượt mà khi di chuột hoặc thả trôi
      if (moving || isHovered.current || !motion.matches || gesture.current) {
        schedule();
      }
    }

    async function initialize() {
      if (scene || initializing || cancelled) return;
      initializing = true;
      try {
        const { createBookScene } = await import('../graphics/bookScene');
        if (cancelled) return;
        scene = createBookScene(canvas);
        if (scene) {
          scene.draw(current.yaw, current.pitch, current.zoom);
          setReady(true);
          schedule();
        }
      } catch {
        if (!cancelled) setReady(false);
      } finally {
        initializing = false;
      }
    }

    function onLost(event) {
      event.preventDefault();
      cancelAnimationFrame(frame);
      frame = 0;
      scene = null;
      setReady(false);
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        initialize();
        schedule();
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });

    const resize = new ResizeObserver(schedule);
    observer.observe(canvas);
    resize.observe(canvas);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', initialize);
    requestDraw.current = schedule;

    return () => {
      cancelled = true;
      observer.disconnect();
      resize.disconnect();
      cancelAnimationFrame(frame);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', initialize);
      scene?.dispose();
      requestDraw.current = null;
    };
  }, [defaultZoom]);

  function adjust(yaw = 0, pitch = 0, zoom = 0) {
    const view = target.current;
    view.yaw += yaw;
    view.pitch = clamp(view.pitch + pitch, -0.48, 0.62);
    const minZ = isLogin ? 0.72 : 0.86;
    const maxZ = isLogin ? 1.45 : 1.74;
    view.zoom = clamp(view.zoom + zoom, minZ, maxZ);
    requestDraw.current?.();
  }

  function reset() {
    target.current = { ...home };
    hoverOffset.current = { yaw: 0, pitch: 0 };
    requestDraw.current?.();
  }

  function keyMove(event) {
    const moves = {
      ArrowLeft: [-0.16],
      ArrowRight: [0.16],
      ArrowUp: [0, 0.12],
      ArrowDown: [0, -0.12],
      '+': [0, 0, 0.12],
      '=': [0, 0, 0.12],
      '-': [0, 0, -0.12],
    };
    if (event.key === 'Home') {
      event.preventDefault();
      reset();
    } else if (moves[event.key]) {
      event.preventDefault();
      adjust(...moves[event.key]);
    }
  }

  // Bắt đầu kéo xoay chuột thủ công
  function dragStart(event) {
    if (!ready || gesture.current || event.button !== 0) return;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  // Khi di chuyển chuột (Hỗ trợ HOVER TỨC THÌ không cần click, và hỗ trợ DRAG khi click)
  function onPointerMove(event) {
    // 1. Nếu đang nhấn giữ chuột kéo (Drag)
    if (gesture.current && gesture.current.id === event.pointerId) {
      const from = gesture.current;
      adjust((event.clientX - from.x) * 0.009, (event.clientY - from.y) * 0.007);
      gesture.current = { ...from, x: event.clientX, y: event.clientY };
      return;
    }

    // 2. Chuyển động ngay khi di chuột vào (Hover movement - không phải đợi click)
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const nx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const ny = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      hoverOffset.current = {
        yaw: nx * 0.55,
        pitch: -ny * 0.35,
      };
      isHovered.current = true;
      requestDraw.current?.();
    }
  }

  function onPointerEnter() {
    isHovered.current = true;
    requestDraw.current?.();
  }

  function onPointerLeave() {
    isHovered.current = false;
    hoverOffset.current = { yaw: 0, pitch: 0 };
    requestDraw.current?.();
  }

  function dragEnd(event) {
    if (gesture.current?.id === event.pointerId) gesture.current = null;
  }

  return (
    <div
      className={`book-stage ${compact ? 'book-stage-compact' : ''} ${
        isLogin ? 'book-stage-login' : 'book-stage-enlarged'
      }`}
      data-renderer={ready ? 'webgl' : 'static'}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <span className="stage-orbit" aria-hidden="true" />
      <div className="stage-fallback" aria-hidden="true">
        <div className="stage-book stage-book-back">
          <span>LIBRARY 3D</span>
          <BookOpen size={26} />
          <strong>Sách số<br />3D.</strong>
        </div>
        <div className="stage-book stage-book-front">
          <span>DIGITAL BOOK</span>
          <strong>Thư viện<br /><em>thông minh</em>.</strong>
          <span className="stage-book-rule" />
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="stage-canvas"
        tabIndex={ready ? 0 : -1}
        aria-hidden={!ready}
        aria-label="Cảnh hai cuốn sách 3D có thể xoay"
        aria-describedby={helpId}
        onKeyDown={keyMove}
        onPointerDown={dragStart}
        onPointerMove={onPointerMove}
        onPointerUp={dragEnd}
        onPointerCancel={dragEnd}
        onLostPointerCapture={dragEnd}
      />
      {ready && (
        <div className="stage-controls">
          <span id={helpId} className="stage-hint">
            <Move size={14} />
            <span>
              Di chuột để chuyển động
              <span className="sr-only">, kéo để xoay tự do hoặc dùng phím mũi tên. Nhấn cộng hoặc trừ để thu phóng, Home để đặt lại.</span>
            </span>
          </span>
          <div className="stage-buttons" aria-label="Điều khiển cảnh 3D">
            <button
              type="button"
              aria-label="Thu nhỏ cảnh 3D"
              title="Thu nhỏ"
              onClick={() => adjust(0, 0, -0.12)}
            >
              <Minus size={15} />
            </button>
            <button
              type="button"
              aria-label="Phóng to cảnh 3D"
              title="Phóng to"
              onClick={() => adjust(0, 0, 0.12)}
            >
              <Plus size={15} />
            </button>
            <button
              type="button"
              aria-label="Đặt lại góc nhìn 3D"
              title="Đặt lại góc nhìn"
              onClick={reset}
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      )}
      <span className="stage-label">
        <Box size={14} /> GÓC NHÌN 3D
      </span>
    </div>
  );
}
