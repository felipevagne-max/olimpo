import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import MatrixColumns from '@/components/olimpo/MatrixColumns';
import TitleEquipEffect from '@/components/olimpo/TitleEquipEffect';
import SplashScreen from '@/components/olimpo/SplashScreen';

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Initialize and check for overdue tasks with minimum 3s splash duration
    const init = async () => {
      const startTime = Date.now();
      const MIN_SPLASH_DURATION = 3000;

      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const tasks = await base44.entities.Task.list();
        
        // Roll overdue tasks to today
        const overdueTasks = tasks.filter(t => 
          !t.completed && 
          !t.archived && 
          t.date < today
        );

        for (const task of overdueTasks) {
          await base44.entities.Task.update(task.id, {
            rolledFromDate: task.date,
            date: today,
            isOverdue: true
          });
        }
      } catch (error) {
        console.error('Error rolling overdue tasks:', error);
      }
      
      // Ensure minimum splash duration
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_SPLASH_DURATION - elapsed);
      
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      setIsChecking(false);
    };

    init();
  }, [currentPageName, navigate]);

  if (isChecking) {
    return <SplashScreen />;
  }

  return (
    <>
      <MatrixColumns opacity={0.05} />
      <TitleEquipEffect />
      <div className="min-h-screen bg-black relative overflow-hidden">
        <style>{`
          body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
          }
        `}</style>
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
      </>
      );
      }