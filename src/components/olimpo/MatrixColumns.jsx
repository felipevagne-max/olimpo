import { useEffect, useRef } from 'react';

export default function MatrixColumns({ opacity = 0.18 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = '01{}[]<>;:/\\const==if';
    const columns = 7;
    const columnWidth = canvas.width / columns;
    const drops = Array(columns).fill(0).map(() => Math.random() * canvas.height);
    const speeds = Array(columns).fill(0).map(() => 0.6 + Math.random() * 1.8);

    function draw() {
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(opacity * 2.5, 0.25)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Glow effect (reduced intensity)
      ctx.shadowBlur = 4;
      ctx.shadowColor = `rgba(0, 255, 102, ${opacity * 0.8})`;
      
      ctx.fillStyle = `rgba(0, 255, 102, ${opacity})`;
      ctx.font = 'bold 14px JetBrains Mono, monospace';

      for (let i = 0; i < columns; i++) {
        const x = i * columnWidth + columnWidth / 2;
        const char = chars[Math.floor(Math.random() * chars.length)];
        
        // Brighter head
        ctx.fillStyle = `rgba(200, 255, 200, ${opacity * 1.3})`;
        ctx.fillText(char, x, drops[i]);
        
        // Dimmer tail
        ctx.fillStyle = `rgba(0, 255, 102, ${opacity * 0.6})`;
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, drops[i] - 20);

        drops[i] += speeds[i];
        if (drops[i] > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
      }
      
      ctx.shadowBlur = 0;
    }

    const interval = setInterval(draw, 66); // ~15fps para reduzir CPU

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
      className="fixed top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}