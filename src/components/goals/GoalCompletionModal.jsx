import { useState, useEffect } from 'react';
import { differenceInDays } from 'date-fns';
import { Trophy, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import OlimpoButton from '../olimpo/OlimpoButton';

export default function GoalCompletionModal({ open, goal, onRestart, onComplete }) {
  const [daysToComplete, setDaysToComplete] = useState(1);

  useEffect(() => {
    if (open && goal) {
      const createdDate = new Date(goal.created_date);
      const now = new Date();
      const days = Math.max(1, differenceInDays(now, createdDate));
      setDaysToComplete(days);
    }
  }, [open, goal]);

  if (!goal) return null;

  return (
    <Dialog open={open}>
      <DialogContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)] max-w-md">
        {/* Lightning effect */}
        <div 
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            background: 'radial-gradient(circle at center, rgba(0,255,102,0.15) 0%, transparent 70%)',
            animation: 'goal-completion-pulse 1s ease-out'
          }}
        />
        <style>{`
          @keyframes goal-completion-pulse {
            0% { opacity: 0; transform: scale(0.9); }
            50% { opacity: 1; transform: scale(1.05); }
            100% { opacity: 0.3; transform: scale(1); }
          }
        `}</style>

        <DialogHeader>
          <DialogTitle 
            className="text-center text-[#00FF66] text-2xl flex flex-col items-center gap-3"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            <div 
              className="w-16 h-16 rounded-full bg-[rgba(0,255,102,0.2)] flex items-center justify-center"
              style={{ 
                boxShadow: '0 0 20px rgba(0,255,102,0.4)',
                animation: 'trophy-glow 2s ease-in-out infinite'
              }}
            >
              <Trophy className="w-8 h-8 text-[#00FF66]" />
            </div>
            Meta concluída!
          </DialogTitle>
        </DialogHeader>

        <style>{`
          @keyframes trophy-glow {
            0%, 100% { filter: drop-shadow(0 0 10px rgba(0,255,102,0.5)); }
            50% { filter: drop-shadow(0 0 20px rgba(0,255,102,0.8)); }
          }
        `}</style>

        <div className="py-6 text-center space-y-4">
          <p className="text-[#E8E8E8] text-lg font-semibold">
            {goal.title}
          </p>
          <p className="text-[#9AA0A6] text-sm">
            Você levou <span className="text-[#00FF66] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {daysToComplete} {daysToComplete === 1 ? 'dia' : 'dias'}
            </span> para atingir essa meta.
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <OlimpoButton
            onClick={onRestart}
            variant="secondary"
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reiniciar meta
          </OlimpoButton>
          <OlimpoButton
            onClick={onComplete}
            className="w-full"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Concluir meta
          </OlimpoButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}