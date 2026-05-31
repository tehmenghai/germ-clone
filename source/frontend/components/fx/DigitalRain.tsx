"use client";

import { useEffect, useRef } from "react";

// Matches handoff spec: 8px JetBrains Mono, column spacing fs*2.2, drop speed 0.08/frame,
// fade trail rgba(8,16,11,0.025), two opacity tiers (40% standard, 55% rare flash)
const CHARS =
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ∂∑∫√≈±×÷01∞αβγδεζηθ";

export function DigitalRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const FS = 8;
    const COL_W = Math.ceil(FS * 2.2);
    // fractional drop positions per column (handoff: 0.08 units/frame)
    let drops: number[] = [];
    let animId: number;

    function resize() {
      if (!canvas) return;
      const cols = Math.floor(canvas.offsetWidth / COL_W);
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      drops = Array(cols).fill(0).map(() => Math.random() * -(canvas.height / FS));
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function draw() {
      if (!canvas || !ctx) return;
      // Fade trail — handoff value
      ctx.fillStyle = "rgba(8,16,11,0.025)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${FS}px "JetBrains Mono", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x = i * COL_W;
        const y = Math.floor(drops[i]) * FS;

        // Rare bright flash (55%) vs standard (40%) — per handoff
        const flash = Math.random() > 0.93;
        ctx.fillStyle = flash
          ? "rgba(52, 224, 138, 0.55)"
          : "rgba(52, 224, 138, 0.40)";
        ctx.fillText(char, x, y);

        // Reset when column exits bottom
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += 0.08;
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        opacity: 1,
        pointerEvents: "none",
      }}
    />
  );
}
