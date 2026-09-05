"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";

interface ConfettiCelebrationProps {
  show: boolean;
  onComplete?: () => void;
}

const COLORS = ["#7ac943", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

export function ConfettiCelebration({ show, onComplete }: ConfettiCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!show || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 20,
        vy: Math.random() * -15 - 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 10 + 5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    let frame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let activeCount = 0;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.5;
        p.rotation += p.rotationSpeed;

        if (p.y < canvas.height + 50) {
          activeCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2);
          ctx.restore();
        }
      });

      if (activeCount > 0) {
        frame = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50" />}
    </AnimatePresence>
  );
}
