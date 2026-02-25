import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { entities } from '@/components/olimpo/entityClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import EmptyState from '@/components/olimpo/EmptyState';
import HabitDetailModal from '@/components/habits/HabitDetailModal';
import HabitsProgressGrid from '@/components/habits/HabitsProgressGrid';
import { XPGainManager, triggerXPGain } from '@/components/olimpo/XPGainEffect';
import { Plus, Check, Flame, Zap, MoreVertical, Pencil, Archive, Trash2, CheckSquare } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Habits() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [filter, setFilter] = useState('all');
  const [deleteId, setDeleteId] = useState(null);
  const [selectedHabitId, setSelectedHabitId] = useState(null);

  const user = (() => { try { return JSON.parse(localStorage.getItem('olimpo_session') || 'null'); } catch { return null; } })();

  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: () => entities.Habit.list(),
    staleTime: 0
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habitLogs'],
    queryFn: () => entities.HabitLog.list(),
    staleTime: 0
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      return profiles[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 600000
  });



  const archiveMutation = useMutation({
    mutationFn: (id) => entities.Habit.update(id, { archived: true }),
    onSuccess: () => queryClient.invalidateQueries(['habits'])
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Habit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['habits']);
      setDeleteId(null);
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

  const filteredHabits = habits.filter(h => {
    if (filter === 'archived') return h.archived;
    if (filter === 'active') return !h.archived;
    return !h.archived;
  });

  const todayCompletedCount = habitLogs.filter(l => l.date === today && l.completed).length;
  const todayXP = habitLogs
    .filter(l => l.date === today && l.completed)
    .reduce((sum, l) => sum + (l.xpEarned || 8), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 relative">
      <div className="px-4 pt-20 lg:pt-24 lg:max-w-6xl lg:mx-auto lg:px-8">
        {/* Habits List - Mobile & Desktop */}
        <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 
            className="text-xl font-bold text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            HÁBITOS
          </h1>
          <OlimpoButton onClick={() => navigate(createPageUrl('CreateHabit'))}>
            <Plus className="w-4 h-4 mr-1" />
            Hábito
          </OlimpoButton>
        </div>
        <p className="text-[#9AA0A6] text-sm mb-6">Transforme rotina em progresso.</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <OlimpoCard className="p-3 text-center">
            <Flame className="w-5 h-5 text-[#00FF66] mx-auto mb-1" />
            <p className="text-lg font-bold text-[#E8E8E8]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {Math.max(...habits.map(h => calculateStreak(h.id)), 0)}
            </p>
            <p className="text-[10px] text-[#9AA0A6]">Maior Streak</p>
          </OlimpoCard>

          <OlimpoCard className="p-3 text-center">
            <CheckSquare className="w-5 h-5 text-[#00FF66] mx-auto mb-1" />
            <p className="text-lg font-bold text-[#E8E8E8]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {todayCompletedCount}/{habits.filter(h => !h.archived).length}
            </p>
            <p className="text-[10px] text-[#9AA0A6]">Hoje</p>
          </OlimpoCard>

          <OlimpoCard className="p-3 text-center">
            <Zap className="w-5 h-5 text-[#00FF66] mx-auto mb-1" />
            <p className="text-lg font-bold text-[#00FF66]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              +{todayXP}
            </p>
            <p className="text-[10px] text-[#9AA0A6]">XP Hoje</p>
          </OlimpoCard>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {['all', 'active', 'archived'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-[#00FF66] text-black'
                  : 'bg-[#0B0F0C] text-[#9AA0A6] border border-[rgba(0,255,102,0.18)]'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Arquivados'}
            </button>
          ))}
        </div>

        {/* Habits List */}
        {filteredHabits.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="Nenhum hábito cadastrado"
            description="Crie seu primeiro hábito para começar a ganhar XP diariamente."
            actionLabel="Criar Primeiro Hábito"
            onAction={() => navigate(createPageUrl('CreateHabit'))}
          />
        ) : (
          <div className="space-y-3">
            {filteredHabits.map(habit => {
              const todayLog = habitLogs.find(l => l.habitId === habit.id && l.date === today);
              const isCompleted = todayLog?.completed;
              const streak = calculateStreak(habit.id);

              return (
                <OlimpoCard 
                  key={habit.id} 
                  className="relative cursor-pointer hover:border-[#00FF66] transition-all"
                  onClick={(e) => {
                    // Don't open modal if clicking dropdown
                    if (e.target.closest('[data-radix-collection-item]')) {
                      return;
                    }
                    setSelectedHabitId(habit.id);
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Progress bar visual instead of checkbox */}
                    <div className={`w-1 h-16 rounded-full ${
                      isCompleted 
                        ? 'bg-gradient-to-b from-[#00FF66] to-[#00DD55]' 
                        : 'bg-gradient-to-b from-[rgba(0,255,102,0.3)] to-[rgba(0,255,102,0.1)]'
                    } ${habit.archived ? 'opacity-30' : ''}`} />

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckSquare className={`w-4 h-4 ${isCompleted ? 'text-[#00FF66]' : 'text-[#9AA0A6]'} ${habit.archived ? 'opacity-50' : ''}`} />
                        <h3 className={`font-medium ${habit.archived ? 'text-[#9AA0A6]' : isCompleted ? 'text-[#00FF66]' : 'text-[#E8E8E8]'}`}>
                          {habit.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs ${habit.archived ? 'text-[#6B7280]' : 'text-[#9AA0A6]'}`}>
                          {habit.frequencyType === 'daily' ? 'Diário' : 
                           habit.frequencyType === 'weekdays' ? habit.weekdays?.join(', ') : 
                           `${habit.timesPerWeek}x/semana`}
                        </span>
                        <div className="flex items-center gap-1">
                          <Flame className={`w-3 h-3 ${habit.archived ? 'opacity-50' : 'text-orange-500'}`} />
                          <span className={`text-xs font-mono ${habit.archived ? 'text-[#6B7280]' : 'text-[#E8E8E8]'}`}>{streak}</span>
                        </div>
                        <span className={`text-xs font-mono ${habit.archived ? 'text-[#6B7280]' : 'text-[#00FF66]'}`}>+{habit.xpReward || 8} XP</span>
                      </div>
                    </div>

                    {isCompleted && !habit.archived && (
                      <div className="text-[#00FF66]">
                        <Zap className="w-6 h-6 fill-current" />
                      </div>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 text-[#9AA0A6] hover:text-[#00FF66]">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
                        <DropdownMenuItem 
                          onClick={() => navigate(createPageUrl('CreateHabit') + `?edit=${habit.id}`)}
                          className="text-[#E8E8E8] focus:bg-[rgba(0,255,102,0.1)]"
                        >
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => archiveMutation.mutate(habit.id)}
                          className="text-[#E8E8E8] focus:bg-[rgba(0,255,102,0.1)]"
                        >
                          <Archive className="w-4 h-4 mr-2" /> Arquivar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteId(habit.id)}
                          className="text-[#FF3B3B] focus:bg-[rgba(255,59,59,0.1)]"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </OlimpoCard>
              );
            })}
          </div>
        )}
        </div>

        {/* Progress Grid */}
        <div className="mt-6">
          <HabitsProgressGrid />
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#E8E8E8]">Excluir hábito?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#9AA0A6]">
              Essa ação não pode ser desfeita. O hábito e seu histórico serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(deleteId)}
              className="bg-[#FF3B3B] text-white hover:bg-[#DD2B2B]"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <HabitDetailModal
        open={!!selectedHabitId}
        onClose={() => setSelectedHabitId(null)}
        habitId={selectedHabitId}
      />

      <XPGainManager />
    </div>
  );
}