import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

export default function GoalLightningEffect({ show, onComplete }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      {/* Blue lightning bolt */}
      <div 
        className="relative"
        style={{ animation: 'lightningPulse 0.6s ease-out' }}
      >
        <Zap 
          className="w-32 h-32"
          style={{ 
            color: '#3B82F6',
            filter: 'drop-shadow(0 0 40px rgba(59, 130, 246, 0.8))',
            animation: 'zapRotate 0.6s ease-out'
          }}
        />
        
        {/* Glow effect */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
            filter: 'blur(20px)',
            animation: 'glowPulse 0.6s ease-out'
          }}
        />
      </div>

      {/* Message */}
      <div 
        className="absolute bottom-32 text-center"
        style={{ animation: 'messageSlideUp 0.4s ease-out 0.2s both' }}
      >
        <p 
          className="text-2xl font-bold px-6 py-3 rounded-lg"
          style={{ 
            color: '#3B82F6',
            fontFamily: 'Orbitron, sans-serif',
            textShadow: '0 0 20px rgba(59, 130, 246, 0.6)',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}
        >
          Sua meta foi completa! Parabéns
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes lightningPulse {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes zapRotate {
          0% { transform: rotate(-15deg); }
          50% { transform: rotate(5deg); }
          100% { transform: rotate(0deg); }
        }

        @keyframes glowPulse {
          0% { opacity: 0; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.5); }
          100% { opacity: 0.6; transform: scale(1.2); }
        }

        @keyframes messageSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}