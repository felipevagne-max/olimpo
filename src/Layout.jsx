import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Auto-login local (sem autenticação)
    setIsChecking(false);
  }, [currentPageName, navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[rgba(0,255,102,0.2)] border-t-[#00FF66] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        
        :root {
          --olimpo-bg: #000000;
          --olimpo-surface: #0B0F0C;
          --olimpo-surface2: #070A08;
          --olimpo-primary: #00FF66;
          --olimpo-primary-soft: rgba(0,255,102,0.18);
          --olimpo-text: #E8E8E8;
          --olimpo-muted: #9AA0A6;
          --olimpo-warning: #FFC107;
          --olimpo-danger: #FF3B3B;
        }

        body {
          background-color: var(--olimpo-bg);
          color: var(--olimpo-text);
          font-family: 'Inter', sans-serif;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: var(--olimpo-surface);
        }
        ::-webkit-scrollbar-thumb {
          background: var(--olimpo-primary-soft);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--olimpo-primary);
        }

        /* Date input styling */
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.5;
        }
        
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.5;
        }
      `}</style>
      {children}
    </div>
  );
}