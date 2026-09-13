import React, { useEffect, useRef } from 'react';

interface CapsuleBorderProps {
  isRecording: boolean;
}

export const CapsuleBorder: React.FC<CapsuleBorderProps> = ({ isRecording }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    let distance = 0;

    const pad = 4; // Padding around capsule to prevent any edge clipping

    const render = (now: number) => {
      const dt = Math.min(50, now - lastTime);
      lastTime = now;

      const parent = canvas.parentElement;
      const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      const w_capsule = Math.round(rect.width);
      const h_capsule = Math.round(rect.height);

      if (w_capsule <= 0 || h_capsule <= 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      const W = w_capsule + 2 * pad;
      const H = h_capsule + 2 * pad;

      const targetBufferW = Math.round(W * dpr);
      const targetBufferH = Math.round(H * dpr);

      if (canvas.width !== targetBufferW || canvas.height !== targetBufferH) {
        canvas.width = targetBufferW;
        canvas.height = targetBufferH;
        canvas.style.width = `${W}px`;
        canvas.style.height = `${H}px`;
        canvas.style.top = `-${pad}px`;
        canvas.style.left = `-${pad}px`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      // Exact geometry centered inside padded canvas
      const y_top = pad + 0.5;
      const y_bottom = pad + h_capsule - 0.5;
      const r = Math.max(1, (h_capsule - 1) / 2);
      const cy = pad + 0.5 + r;
      const cx_left = pad + 0.5 + r;
      const cx_right = Math.max(cx_left, pad + w_capsule - 0.5 - r);
      const straight = Math.max(0, cx_right - cx_left);

      // 1. Permanent Base Border (1px crisp subtle white)
      ctx.beginPath();
      ctx.moveTo(cx_left, y_top);
      ctx.lineTo(cx_right, y_top);
      ctx.arc(cx_right, cy, r, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(cx_left, y_bottom);
      ctx.arc(cx_left, cy, r, Math.PI / 2, (3 * Math.PI) / 2);
      ctx.closePath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = isRecording ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.18)';
      ctx.stroke();

      // 2. Continuous silky-smooth travelling beam
      if (isRecording) {
        const l1 = straight;
        const l2 = Math.PI * r;
        const l3 = straight;
        const l4 = Math.PI * r;
        const P = l1 + l2 + l3 + l4;

        if (P > 0) {
          // Speed: ~2.8 seconds per complete cycle
          const speed = P / 2800;
          distance = (distance + dt * speed) % P;

          const getPoint = (d: number) => {
            let s = ((d % P) + P) % P;

            if (s < l1) {
              return { x: cx_left + s, y: y_top };
            }
            s -= l1;

            if (s < l2) {
              const a = -Math.PI / 2 + s / r;
              return { x: cx_right + r * Math.cos(a), y: cy + r * Math.sin(a) };
            }
            s -= l2;

            if (s < l3) {
              return { x: cx_right - s, y: y_bottom };
            }
            s -= l3;

            const a = Math.PI / 2 + s / r;
            return { x: cx_left + r * Math.cos(a), y: cy + r * Math.sin(a) };
          };

          const beamLen = Math.min(84, P * 0.25);
          const steps = 140; // 140 micro-segments along 84px (~0.6px each)
          const startDist = distance - beamLen / 2;

          // Precompute points to avoid redundant math
          const points: { x: number; y: number }[] = [];
          for (let i = 0; i <= steps; i++) {
            points.push(getPoint(startDist + (i / steps) * beamLen));
          }

          // Pass 1: Soft optical bloom to completely eliminate raster staircasing
          for (let i = 0; i < steps; i++) {
            const t = (i + 0.5) / steps;
            const taper = Math.sin(t * Math.PI);
            const bloomAlpha = Math.pow(taper, 2.0) * 0.28;
            if (bloomAlpha < 0.01) continue;

            const p0 = points[i];
            const p1 = points[i + 1];

            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineWidth = 3.2;
            ctx.lineCap = 'butt';
            ctx.strokeStyle = `rgba(255, 255, 255, ${bloomAlpha.toFixed(3)})`;
            ctx.stroke();
          }

          // Pass 2: Core luminous stroke with smooth continuous alpha taper
          for (let i = 0; i < steps; i++) {
            const t = (i + 0.5) / steps;
            const taper = Math.sin(t * Math.PI);
            const coreAlpha = Math.pow(taper, 1.5);
            if (coreAlpha < 0.01) continue;

            // Swells gently from 1.0px to 1.8px in the center
            const strokeWidth = 1.0 + 0.8 * Math.pow(taper, 1.2);

            const p0 = points[i];
            const p1 = points[i + 1];

            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = 'butt';
            ctx.strokeStyle = `rgba(255, 255, 255, ${coreAlpha.toFixed(3)})`;
            ctx.stroke();
          }
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isRecording]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none"
      style={{
        position: 'absolute',
        top: -4,
        left: -4,
        zIndex: 1,
      }}
    />
  );
};
