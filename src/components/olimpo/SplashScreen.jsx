import { useEffect, useRef } from 'react';
import OlimpoLogo from './OlimpoLogo';

export default function SplashScreen() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = '01{}[]<>;:/\\const==if';
    const columns = 4;
    const columnWidth = canvas.width / columns;
    const drops = Array(columns).fill(0).map(() => Math.random() * canvas.height);
    const speeds = Array(columns).fill(0).map(() => 0.5 + Math.random() * 1);

    function draw() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(0, 255, 102, 0.06)';
      ctx.font = '12px JetBrains Mono, monospace';

      for (let i = 0; i < columns; i++) {
        const x = i * columnWidth + columnWidth / 2;
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, x, drops[i]);

        drops[i] += speeds[i];
        if (drops[i] > canvas.height && Math.random() > 0.98) {
          drops[i] = 0;
        }
      }
    }

    const interval = setInterval(draw, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.6 }}
      />
      <div className="relative z-10 flex flex-col items-center">
        <OlimpoLogo size={80} />
        <div className="mt-8 w-12 h-12 border-2 border-[rgba(0,255,102,0.2)] border-t-[#00FF66] rounded-full animate-spin" />
      </div>
    </div>
  );
}