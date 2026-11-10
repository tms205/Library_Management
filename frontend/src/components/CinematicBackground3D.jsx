import { useEffect, useRef } from 'react';

// Tạo danh sách đỉnh và cạnh của quả cầu dây 3D (Geodesic Wireframe Sphere)
function generateSphereGeometry(radius = 145) {
  const phi = (1 + Math.sqrt(5)) / 2;
  const base = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
  ];

  // Chuẩn hóa về mặt cầu bán kính R
  const vertices = base.map(([x, y, z]) => {
    const len = Math.hypot(x, y, z);
    return [(x / len) * radius, (y / len) * radius, (z / len) * radius];
  });

  // Tìm các cạnh tam giác của khối 20 mặt đều
  const edges = [];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const d = Math.hypot(
        vertices[i][0] - vertices[j][0],
        vertices[i][1] - vertices[j][1],
        vertices[i][2] - vertices[j][2]
      );
      if (d < radius * 1.25) {
        edges.push([i, j]);
      }
    }
  }

  // Thêm các điểm giữa cạnh để tạo lưới mắt cáo mật độ cao tựa video
  const midPoints = [];
  const midPointMap = new Map();
  edges.forEach(([i, j], edgeIdx) => {
    const mx = (vertices[i][0] + vertices[j][0]) * 0.5;
    const my = (vertices[i][1] + vertices[j][1]) * 0.5;
    const mz = (vertices[i][2] + vertices[j][2]) * 0.5;
    const mLen = Math.hypot(mx, my, mz);
    const v = [(mx / mLen) * radius, (my / mLen) * radius, (mz / mLen) * radius];
    const newIdx = vertices.length + midPoints.length;
    midPoints.push(v);
    midPointMap.set(`${Math.min(i, j)}_${Math.max(i, j)}`, newIdx);
  });

  const allVertices = [...vertices, ...midPoints];
  const allEdges = [...edges];

  // Nối các điểm giữa cạnh để tạo cấu trúc Geodesic Sphere sắc nét
  edges.forEach(([i, j]) => {
    const midIdx = midPointMap.get(`${Math.min(i, j)}_${Math.max(i, j)}`);
    if (midIdx !== undefined) {
      allEdges.push([i, midIdx]);
      allEdges.push([j, midIdx]);
    }
  });

  return { vertices: allVertices, edges: allEdges };
}

// Tạo các điểm của hình lập phương 3D (Cube) quay quanh quỹ đạo
function generateCubeGeometry(size = 18) {
  const s = size / 2;
  const vertices = [
    [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s],
    [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s],
  ];
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  return { vertices, edges };
}

export default function CinematicBackground3D() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const sphere = generateSphereGeometry(150);
    const cube = generateCubeGeometry(20);

    // Góc quay 3D
    let angleY = 0;
    let angleX = 0.2;
    let orbitAngle = 0;

    // Các hạt bụi không gian (Space Star Dust)
    const starCount = 65;
    const stars = Array.from({ length: starCount }, () => ({
      x: (Math.random() - 0.5) * 1200,
      y: (Math.random() - 0.5) * 900,
      z: Math.random() * 800 - 200,
      size: Math.random() * 1.8 + 0.8,
      speed: Math.random() * 0.4 + 0.2,
      opacity: Math.random() * 0.6 + 0.2,
    }));

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
    }

    resize();
    window.addEventListener('resize', resize);

    function onPointerMove(e) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      mouseRef.current.targetX = (e.clientX - cx) / cx;
      mouseRef.current.targetY = (e.clientY - cy) / cy;
    }

    window.addEventListener('pointermove', onPointerMove);

    // Phép biến đổi xoay 3D (Euler 3D Rotation)
    function rotate3D(x, y, z, ax, ay) {
      // Xoay quanh trục Y
      const cosY = Math.cos(ay);
      const sinY = Math.sin(ay);
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;

      // Xoay quanh trục X
      const cosX = Math.cos(ax);
      const sinX = Math.sin(ax);
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      return [x1, y2, z2];
    }

    // Chiếu phối cảnh 3D lên màn hình 2D
    function project(x, y, z, cx, cy, fov = 650) {
      const depth = fov + z;
      if (depth <= 10) return null;
      const scale = fov / depth;
      return {
        x: cx + x * scale,
        y: cy + y * scale,
        scale,
        z,
      };
    }

    function render() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = Math.min(h * 0.38, 320); // Đặt tâm quả cầu ở khoảng 38% chiều cao màn hình phía sau header

      ctx.clearRect(0, 0, w, h);

      // Cập nhật gia tốc chuột mềm mại (Inertial Mouse Parallax)
      const m = mouseRef.current;
      m.x += (m.targetX - m.x) * 0.05;
      m.y += (m.targetY - m.y) * 0.05;

      angleY += 0.006;
      angleX = 0.18 + m.y * 0.35;
      const currentRotY = angleY + m.x * 0.45;
      orbitAngle += 0.009;

      // 1. Vẽ các hạt bụi không gian (Star Particles)
      stars.forEach((star) => {
        star.z -= star.speed;
        if (star.z < -200) star.z = 600;
        const p = project(star.x + m.x * 40, star.y + m.y * 30, star.z, cx, cy);
        if (p) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, star.size * p.scale, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(131, 201, 185, ${star.opacity * Math.min(1, p.scale)})`;
          ctx.fill();
        }
      });

      // 2. Vẽ Vòng quỹ đạo chính nằm ngang (Tilted Horizontal Orbital Ring - R = 280)
      const ringRadius = 290;
      const ringSteps = 80;
      ctx.beginPath();
      for (let i = 0; i <= ringSteps; i++) {
        const theta = (i / ringSteps) * Math.PI * 2;
        // Điểm trên mặt phẳng nghiêng 72 độ
        const rx = ringRadius * Math.cos(theta);
        const rz = ringRadius * Math.sin(theta);
        const [px, py, pz] = rotate3D(rx, 0, rz, 1.25 + m.y * 0.2, currentRotY * 0.2);
        const pt = project(px, py, pz, cx, cy);
        if (pt) {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 3. Vẽ Vòng quỹ đạo elip lớn thẳng đứng (Outer Vertical Ellipse - R = 380)
      const outerRingRadius = 370;
      ctx.beginPath();
      for (let i = 0; i <= ringSteps; i++) {
        const theta = (i / ringSteps) * Math.PI * 2;
        const rx = outerRingRadius * Math.cos(theta);
        const ry = outerRingRadius * 1.35 * Math.sin(theta);
        const [px, py, pz] = rotate3D(rx, ry, 0, 0.28 + m.y * 0.25, currentRotY * 0.15 + 0.35);
        const pt = project(px, py, pz, cx, cy);
        if (pt) {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.strokeStyle = 'rgba(131, 201, 185, 0.25)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 4. Vẽ Quả cầu dây 3D Geodesic Wireframe ở trung tâm
      const projVertices = sphere.vertices.map(([vx, vy, vz]) => {
        const [rx, ry, rz] = rotate3D(vx, vy, vz, angleX, currentRotY);
        return project(rx, ry, rz, cx, cy);
      });

      // Vẽ các cạnh nối quả cầu với độ sâu phối cảnh
      sphere.edges.forEach(([i, j]) => {
        const p1 = projVertices[i];
        const p2 = projVertices[j];
        if (p1 && p2) {
          const avgZ = (p1.z + p2.z) / 2;
          const alpha = Math.max(0.08, Math.min(0.65, (avgZ + 150) / 300));
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(16, 185, 129, ${alpha.toFixed(3)})`;
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
      });

      // Vẽ các nốt đỉnh phát quang (Glowing vertices)
      projVertices.forEach((p) => {
        if (p && p.z > -40) {
          const alpha = Math.min(0.85, (p.z + 100) / 220);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.2 * p.scale, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(131, 201, 185, ${alpha.toFixed(2)})`;
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // 5. Vẽ 2 khối hộp lập phương vệ tinh 3D (Satellite Orbiting Cubes) trên vòng quỹ đạo
      [orbitAngle, orbitAngle + Math.PI].forEach((orbA) => {
        const ox = ringRadius * Math.cos(orbA);
        const oz = ringRadius * Math.sin(orbA);
        const [cubeCenterX, cubeCenterY, cubeCenterZ] = rotate3D(
          ox,
          0,
          oz,
          1.25 + m.y * 0.2,
          currentRotY * 0.2
        );

        // Biến đổi các đỉnh của khối lập phương xoay quanh tâm của nó
        const cubeProjVertices = cube.vertices.map(([cx1, cy1, cz1]) => {
          const [rx, ry, rz] = rotate3D(cx1, cy1, cz1, orbA * 2, orbA * 3);
          return project(
            cubeCenterX + rx,
            cubeCenterY + ry,
            cubeCenterZ + rz,
            cx,
            cy
          );
        });

        // Vẽ các cạnh khối lập phương vệ tinh
        cube.edges.forEach(([ci, cj]) => {
          const cp1 = cubeProjVertices[ci];
          const cp2 = cubeProjVertices[cj];
          if (cp1 && cp2) {
            ctx.beginPath();
            ctx.moveTo(cp1.x, cp1.y);
            ctx.lineTo(cp2.x, cp2.y);
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
            ctx.lineWidth = 1.3;
            ctx.stroke();
          }
        });
      });

      animId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="cinematic-3d-canvas-backdrop"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
}
