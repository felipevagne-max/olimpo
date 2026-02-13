import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Mail, ArrowRight, Code2 } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [email, setEmail] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          navigate('/Dashboard');
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
      setIsChecking(false);
    };
    checkAuth();
  }, [navigate]);

  // Matrix rain effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    function draw() {
      ctx.fillStyle = 'rgba(5, 5, 8, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(0, 255, 102, 0.08)';
      ctx.font = fontSize + 'px JetBrains Mono, monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
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
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="text-[#00FF66] text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          Verificando acesso...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] relative overflow-hidden flex items-center justify-center p-4">
      {/* Matrix Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ filter: 'blur(0.5px)' }}
      />

      {/* Bottom Haze */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0, 255, 102, 0.04), transparent)',
          filter: 'blur(40px)'
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md animate-fadeSlideUp">
        {/* Brand */}
        <div className="flex flex-col items-center mb-12">
          <div 
            className="w-16 h-16 rounded-full bg-[#0B0B10] border border-[rgba(0,255,102,0.3)] flex items-center justify-center mb-4 relative"
            style={{
              boxShadow: '0 0 20px rgba(0, 255, 102, 0.15)',
            }}
          >
            <Code2 className="w-8 h-8 text-[#00FF66]" strokeWidth={1.5} />
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle at center, rgba(0, 255, 102, 0.1), transparent)',
              }}
            />
          </div>
          <h1 
            className="text-4xl font-bold text-[#00FF66] tracking-tight"
            style={{ 
              fontFamily: 'Orbitron, sans-serif',
              textShadow: '0 0 30px rgba(0, 255, 102, 0.3)'
            }}
          >
            OLIMPO
          </h1>
        </div>

        {/* Card */}
        <div 
          className="bg-[#0B0B10] rounded-2xl p-8 border border-[rgba(0,255,102,0.18)] relative overflow-hidden"
          style={{
            boxShadow: '0 0 40px rgba(0, 255, 102, 0.08)',
          }}
        >
          {/* Card Glow Effect */}
          <div 
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(0, 255, 102, 0.08), transparent)',
              filter: 'blur(30px)'
            }}
          />
          
          <div className="relative">
            {/* Heading */}
            <h2 className="text-2xl font-semibold text-white mb-2">
              Acesse sua conta
            </h2>
            <p 
              className="text-white/70 text-sm mb-6"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Digite o email usado na compra para continuar
            </p>

            {/* Form */}
            <div className="space-y-6">
              {/* Email Field */}
              <div>
                <label 
                  className="block text-white/90 text-sm mb-2"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  Email
                </label>
                <div className="relative group">
                  <Mail 
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#00FF66]/50 transition-colors duration-200 group-focus-within:text-[#00FF66]" 
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-[#050508] text-white pl-12 pr-4 py-3.5 rounded-lg border border-[rgba(0,255,102,0.18)] outline-none transition-all duration-200 placeholder:text-white/30"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(0, 255, 102, 0.5)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(0, 255, 102, 0.1), 0 0 20px rgba(0, 255, 102, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(0, 255, 102, 0.18)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Button */}
              <button
                className="w-full bg-[#00FF66] hover:bg-[#00E676] active:bg-[#19FF7A] text-black font-semibold py-3.5 px-6 rounded-lg transition-all duration-150 flex items-center justify-center gap-2 group relative overflow-hidden"
                style={{
                  boxShadow: '0 0 20px rgba(0, 255, 102, 0.25)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 102, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 102, 0.25)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(1px) scale(0.98)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
              >
                <span>Continuar</span>
                <ArrowRight className="w-5 h-5 transition-transform duration-150 group-hover:translate-x-1" />
                
                {/* Button shine effect */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    animation: 'shine 1.5s infinite'
                  }}
                />
              </button>
            </div>

            {/* Helper Text */}
            <p 
              className="text-white/50 text-xs text-center mt-6"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              Apenas usuários com assinatura ativa podem acessar
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-6">
          <p className="text-white/40 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Sistema protegido • Acesso via Cakto
          </p>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shine {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-fadeSlideUp {
          animation: fadeSlideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* Smooth focus ring */
        input:focus-visible {
          outline: none;
        }
      `}</style>
    </div>
  );
}