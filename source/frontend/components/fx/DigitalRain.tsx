"use client";

import { useEffect, useRef } from "react";

// Full-width katakana + digits, dense columns, fast cascade with bright leading char
const CHARS =
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789";

interface Drop {
  y: number;       // current row (float)
  speed: number;   // rows per frame
  length: number;  // trail length in chars
}

export function DigitalRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const FS = 16;
    const COL_W = 18;
    let drops: Drop[] = [];
    let animId: number;
    let frameCount = 0; // used for 50% speed reduction via frame-skip

    function resize() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx!.scale(dpr, dpr);

      const cols = Math.floor(canvas.offsetWidth / COL_W);
      drops = Array.from({ length: cols }, () => ({
        y: -Math.floor(Math.random() * 30),
        speed: 0.3 + Math.random() * 0.5,
        length: 8 + Math.floor(Math.random() * 20),
      }));

      // Pure black background on resize
      ctx!.fillStyle = "#000";
      ctx!.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    }

    const isLight = () =>
      document.documentElement.getAttribute("data-theme") === "clinical";

    resize();
    const ro = new ResizeObserver(() => {
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      resize();
    });
    ro.observe(canvas);

    // Watch theme changes — clear canvas immediately when switching to light
    const mo = new MutationObserver(() => {
      if (isLight() && canvas) {
        ctx!.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      }
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    function draw() {
      if (!canvas || !ctx) return;
      // No rain in light/clinical mode
      if (isLight()) { animId = requestAnimationFrame(draw); return; }

      frameCount++;
      // 50% speed: only advance drops every other frame
      const advance = frameCount % 2 === 0;

      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      // Slower fade so trail lingers longer
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      ctx.fillRect(0, 0, w, h);

      ctx.font = `${FS}px "JetBrains Mono", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];
        const x = i * COL_W;
        const headY = Math.floor(drop.y) * FS;

        // Trail — dimmer alpha (0.28 max)
        for (let t = 1; t < drop.length; t++) {
          const ty = headY - t * FS;
          if (ty < 0) continue;
          const fade = 1 - t / drop.length;
          const alpha = Math.max(0.02, fade * 0.28);
          ctx.fillStyle = `rgba(0,180,70,${alpha.toFixed(2)})`;
          ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, ty);
        }

        // Leading char — dimmer than before (was #afffce/#00e050)
        if (headY >= 0 && headY <= h) {
          ctx.fillStyle = Math.random() > 0.5 ? "rgba(0,210,90,0.65)" : "rgba(0,160,60,0.55)";
          ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, headY);
        }

        if (advance) {
          drop.y += drop.speed;
        }

        // Reset when head exits bottom
        if (headY > h + drop.length * FS) {
          drop.y = -Math.floor(Math.random() * 20);
          drop.speed = 0.3 + Math.random() * 0.5;
          drop.length = 8 + Math.floor(Math.random() * 20);
        }
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
