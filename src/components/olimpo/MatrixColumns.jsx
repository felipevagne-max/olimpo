import { useEffect, useRef } from 'react';

export default function MatrixColumns({ opacity = 0.05 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = '01{}[]<>;:/\\const==if';
    const columns = 5;
    const columnWidth = canvas.width / columns;
    const drops = Array(columns).fill(0).map(() => Math.random() * canvas.height);
    const speeds = Array(columns).fill(0).map(() => 0.5 + Math.random() * 1.5);

    function draw() {
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 3})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = `rgba(0, 255, 102, ${opacity})`;
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

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, [opacity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.5 }}
    />
  );
}