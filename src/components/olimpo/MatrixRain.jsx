import { useEffect, useRef } from 'react';

export default function MatrixRain({ opacity = 0.08, side = 'both' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = 60;
    const height = canvas.height = window.innerHeight;
    
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';
    const charArray = chars.split('');
    const fontSize = 12;
    const columns = width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#00FF66';
      ctx.font = `${fontSize}px monospace`;
      
      for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        
        if (drops[i] * fontSize > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-y-0 z-0" style={{ opacity }}>
      {(side === 'left' || side === 'both') && (
        <canvas ref={canvasRef} className="absolute left-0 top-0" />
      )}
      {(side === 'right' || side === 'both') && (
        <canvas ref={canvasRef} className="absolute right-0 top-0" />
      )}
    </div>
  );
}