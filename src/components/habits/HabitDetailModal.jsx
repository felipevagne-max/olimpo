import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { entities } from '@/components/olimpo/entityClient';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import OlimpoButton from '../olimpo/OlimpoButton';
import { CheckSquare, Flame, Zap, Edit2, Archive, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function HabitDetailModal({ open, onClose, habitId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const user = (() => { try { return JSON.parse(localStorage.getItem('olimpo_session') || 'null'); } catch { return null; } })();

  const { data: habit } = useQuery({
    queryKey: ['habit', habitId],
    queryFn: async () => {
      if (!habitId) return null;
      const habits = await entities.Habit.list();
      return habits.find(h => h.id === habitId);
    },
    enabled: !!habitId && open
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habitLogs'],
    queryFn: () => entities.HabitLog.list(),
    enabled: open
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      return profiles[0] || null;
    },
    enabled: !!user?.email
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => entities.Habit.update(id, { archived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['habits']);
      toast.success('Hábito arquivado');
      onClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Habit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['habits']);
      toast.success('Hábito excluído');
      onClose();
    }
  });

  const toggleHabitMutation = useMutation({
    mutationFn: async (habit) => {
      const todayLog = habitLogs.find(l => l.habitId === habit.id && l.date === today);
      
      if (todayLog?.completed) {
        toast.error('Conclusão confirmada. Não é possível desfazer.');
        throw new Error('Cannot uncomplete habit');
      }
      
      const xpAmount = habit.xpReward || 8;
      
      if (todayLog) {
        await base44.entities.HabitLog.update(todayLog.id, { completed: true, xpEarned: xpAmount });
      } else {
        await base44.entities.HabitLog.create({
          habitId: habit.id,
          date: today,
          completed: true,
          xpEarned: xpAmount
        });
      }
      
      const { awardXp } = await import('@/components/xpSystem');
      const sfxEnabled = userProfile?.sfxEnabled ?? true;
      
      await awardXp({
        amount: xpAmount,
        sourceType: 'habit',
        sourceId: habit.id,
        note: `Hábito: ${habit.name}`,
        sfxEnabled
      });
      
      return xpAmount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['habitLogs']);
      queryClient.invalidateQueries(['xpTransactions']);
    }
  });

  const calculateStreak = (habitId) => {
    const logs = habitLogs
      .filter(l => l.habitId === habitId && l.completed)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (logs.length === 0) return 0;
    
    let streak = 0;
    let currentDate = new Date();
    
    for (const log of logs) {
      const logDate = new Date(log.date);
      const diffDays = Math.floor((currentDate - logDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        streak++;
        currentDate = logDate;
      } else {
        break;
      }
    }
    
    return streak;
  };

  if (!habit) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
          <DialogHeader>
            <DialogTitle className="text-[#E8E8E8]">Hábito não encontrado</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-[#9AA0A6] text-sm">Não foi possível abrir este hábito.</p>
          </div>
          <OlimpoButton onClick={onClose} className="w-full">Fechar</OlimpoButton>
        </DialogContent>
      </Dialog>
    );
  }

  const todayLog = habitLogs.find(l => l.habitId === habit.id && l.date === today);
  const isCompleted = todayLog?.completed;
  const streak = calculateStreak(habit.id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)] max-w-md">
        <DialogHeader>
          <DialogTitle 
            className="text-[#00FF66] text-xl"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {habit.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Description */}
          {habit.description && (
            <p className="text-sm text-[#9AA0A6]">{habit.description}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#070A08] p-3 rounded-lg border border-[rgba(0,255,102,0.18)] text-center">
              <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-[#E8E8E8]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {streak}
              </p>
              <p className="text-xs text-[#9AA0A6]">Sequência</p>
            </div>

            <div className="bg-[#070A08] p-3 rounded-lg border border-[rgba(0,255,102,0.18)] text-center">
              <Zap className="w-5 h-5 text-[#00FF66] mx-auto mb-1" />
              <p className="text-lg font-bold text-[#00FF66]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                +{habit.xpReward || 8}
              </p>
              <p className="text-xs text-[#9AA0A6]">XP</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#9AA0A6]">Frequência:</span>
              <span className="text-[#E8E8E8]">
                {habit.frequencyType === 'daily' ? 'Diário' : 
                 habit.frequencyType === 'weekdays' ? habit.weekdays?.join(', ') : 
                 `${habit.timesPerWeek}x/semana`}
              </span>
            </div>
            {habit.category && (
              <div className="flex justify-between">
                <span className="text-[#9AA0A6]">Categoria:</span>
                <span className="text-[#E8E8E8]">{habit.category}</span>
              </div>
            )}
            {habit.goalText && (
              <div className="flex justify-between">
                <span className="text-[#9AA0A6]">Meta:</span>
                <span className="text-[#E8E8E8]">{habit.goalText}</span>
              </div>
            )}
            {habit.reminderTimes && habit.reminderTimes.length > 0 && (
              <div className="flex justify-between">
                <span className="text-[#9AA0A6]">Lembretes:</span>
                <span className="text-[#E8E8E8]">{habit.reminderTimes.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            {!isCompleted && !habit.archived && (
              <OlimpoButton
                onClick={() => {
                  toggleHabitMutation.mutate(habit);
                  onClose();
                }}
                className="w-full"
                disabled={toggleHabitMutation.isPending}
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Marcar como Concluído
              </OlimpoButton>
            )}

            <div className="grid grid-cols-3 gap-2">
              <OlimpoButton
                variant="secondary"
                onClick={() => {
                  onClose();
                  navigate(createPageUrl('CreateHabit') + `?edit=${habit.id}`);
                }}
                className="w-full"
              >
                <Edit2 className="w-4 h-4" />
              </OlimpoButton>
              
              <OlimpoButton
                variant="secondary"
                onClick={() => {
                  archiveMutation.mutate(habit.id);
                }}
                className="w-full"
                disabled={archiveMutation.isPending}
              >
                <Archive className="w-4 h-4" />
              </OlimpoButton>

              <OlimpoButton
                variant="secondary"
                onClick={() => {
                  if (confirm('Excluir este hábito permanentemente?')) {
                    deleteMutation.mutate(habit.id);
                  }
                }}
                className="w-full bg-transparent border-[#FF3B3B] text-[#FF3B3B] hover:bg-[rgba(255,59,59,0.1)]"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </OlimpoButton>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}