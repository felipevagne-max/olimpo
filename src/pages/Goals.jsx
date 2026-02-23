import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import OlimpoProgress from '@/components/olimpo/OlimpoProgress';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import EmptyState from '@/components/olimpo/EmptyState';
import GoalLightningEffect from '@/components/goals/GoalLightningEffect';
import { Plus, Target, Trophy, Zap, MoreVertical, Pencil, Archive, Trash2, CheckCircle2, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
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

export default function Goals() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('active');
  const [deleteId, setDeleteId] = useState(null);
  const [showLightning, setShowLightning] = useState(false);

  const user = (() => { try { return JSON.parse(localStorage.getItem('olimpo_session') || 'null'); } catch { return null; } })();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Goal.filter({ created_by: user.email });
    },
    enabled: !!user?.email,
    staleTime: 300000
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.GoalMilestone.filter({ created_by: user.email });
    },
    enabled: !!user?.email,
    staleTime: 300000
  });

  const { data: xpTransactions = [] } = useQuery({
    queryKey: ['xpTransactions'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.XPTransaction.filter({ created_by: user.email });
    },
    enabled: !!user?.email,
    staleTime: 600000
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => base44.entities.Goal.update(id, { status: 'archived' }),
    onSuccess: () => queryClient.invalidateQueries(['goals'])
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Goal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      setDeleteId(null);
    }
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

  const progressGoalMutation = useMutation({
    mutationFn: async (goal) => {
      const prevValue = goal.currentValue || 0;
      const newValue = prevValue + 1;
      
      // Check if crossing 100%
      const prevPercent = goal.targetValue ? (prevValue / goal.targetValue) * 100 : 0;
      const newPercent = goal.targetValue ? (newValue / goal.targetValue) * 100 : 0;
      const crossedCompletion = prevPercent < 100 && newPercent >= 100;
      
      if (crossedCompletion) {
        // Award completion XP
        const { awardXp } = await import('@/components/xpSystem');
        const sfxEnabled = userProfile?.sfxEnabled ?? true;
        
        await awardXp({
          amount: goal.xpOnComplete || 200,
          sourceType: 'goal',
          sourceId: goal.id,
          note: `Meta completa: ${goal.title}`,
          sfxEnabled
        });

        // Play 16-bit lightning sound
        if (sfxEnabled) {
          const audio = new Audio('data:audio/wav;base64,UklGRhYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQIAAAABAQ==');
          audio.volume = 0.3;
          audio.play().catch(() => {});
        }

        // Delete/archive goal
        await base44.entities.Goal.update(goal.id, { deleted_at: new Date().toISOString() });

        return { completed: true, xpGained: goal.xpOnComplete || 200 };
      }
      
      await base44.entities.Goal.update(goal.id, {
        currentValue: newValue
      });

      // Award XP using centralized function
      const { awardXp } = await import('@/components/xpSystem');
      const GOAL_PROGRESS_XP = 5;
      const sfxEnabled = userProfile?.sfxEnabled ?? true;
      
      await awardXp({
        amount: GOAL_PROGRESS_XP,
        sourceType: 'goal',
        sourceId: goal.id,
        note: 'Progresso na meta',
        sfxEnabled
      });

      return { xpGained: GOAL_PROGRESS_XP, completed: false };
    },
    onSuccess: ({ completed, xpGained }) => {
      queryClient.invalidateQueries(['goals']);
      queryClient.invalidateQueries(['xpTransactions']);
      
      if (completed) {
        setShowLightning(true);
      } else {
        toast.success(`+${xpGained} XP`);
      }
    }
  });

  const filteredGoals = goals.filter(g => {
    // Don't show deleted goals
    if (g.deleted_at) return false;
    
    if (filter === 'active') return g.status === 'active';
    if (filter === 'completed') return g.status === 'completed';
    if (filter === 'archived') return g.status === 'archived';
    return true;
  });

  const activeCount = goals.filter(g => g.status === 'active').length;
  const completedCount = goals.filter(g => g.status === 'completed').length;

  const potentialXP = goals
    .filter(g => g.status === 'active')
    .reduce((sum, g) => sum + (g.xpOnComplete || 200), 0);

  const getGoalProgress = (goal) => {
    if (goal.goalType === 'checklist') {
      const goalMilestones = milestones.filter(m => m.goalId === goal.id);
      const completed = goalMilestones.filter(m => m.completed).length;
      return {
        current: completed,
        total: goalMilestones.length,
        percent: goalMilestones.length > 0 ? (completed / goalMilestones.length) * 100 : 0
      };
    }
    return {
      current: goal.currentValue || 0,
      total: goal.targetValue || 100,
      percent: goal.targetValue ? ((goal.currentValue || 0) / goal.targetValue) * 100 : 0
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      <div className="px-4 pt-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 
            className="text-xl font-bold text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            METAS
          </h1>
          <OlimpoButton onClick={() => navigate(createPageUrl('CreateGoal'))}>
            <Plus className="w-4 h-4 mr-1" />
            Meta
          </OlimpoButton>
        </div>
        <p className="text-[#9AA0A6] text-sm mb-6">Missões de longo prazo para chegar ao Olimpo.</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <OlimpoCard className="p-3 text-center">
            <Target className="w-5 h-5 text-[#00FF66] mx-auto mb-1" />
            <p className="text-lg font-bold text-[#E8E8E8]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {activeCount}
            </p>
            <p className="text-[10px] text-[#9AA0A6]">Ativas</p>
          </OlimpoCard>

          <OlimpoCard className="p-3 text-center">
            <Trophy className="w-5 h-5 text-[#FFC107] mx-auto mb-1" />
            <p className="text-lg font-bold text-[#E8E8E8]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {completedCount}
            </p>
            <p className="text-[10px] text-[#9AA0A6]">Concluídas</p>
          </OlimpoCard>

          <OlimpoCard className="p-3 text-center">
            <Zap className="w-5 h-5 text-[#00FF66] mx-auto mb-1" />
            <p className="text-lg font-bold text-[#00FF66]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              +{potentialXP}
            </p>
            <p className="text-[10px] text-[#9AA0A6]">XP Potencial</p>
          </OlimpoCard>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {['active', 'completed', 'archived'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-[#00FF66] text-black'
                  : 'bg-[#0B0F0C] text-[#9AA0A6] border border-[rgba(0,255,102,0.18)]'
              }`}
            >
              {f === 'active' ? 'Ativas' : f === 'completed' ? 'Concluídas' : 'Arquivadas'}
            </button>
          ))}
        </div>

        {/* Goals List */}
        {filteredGoals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Nenhuma meta criada"
            description="Crie sua primeira meta para começar sua jornada ao Olimpo."
            actionLabel="Criar Primeira Meta"
            onAction={() => navigate(createPageUrl('CreateGoal'))}
          />
        ) : (
          <div className="space-y-3">
            {filteredGoals.map(goal => {
              const progress = getGoalProgress(goal);

              return (
                <OlimpoCard 
                  key={goal.id} 
                  className="cursor-pointer hover:bg-[rgba(0,255,102,0.03)] transition-all"
                  onClick={(e) => {
                    // Prevent navigation if clicking on dropdown menu or progress button
                    if (e.target.closest('[data-radix-collection-item]') || 
                        e.target.closest('button[type="button"]')) {
                      return;
                    }
                    navigate(createPageUrl('GoalDetail') + `?id=${goal.id}`);
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {goal.status === 'completed' && (
                          <CheckCircle2 className="w-4 h-4 text-[#00FF66]" />
                        )}
                        <h3 className="font-medium text-[#E8E8E8]">{goal.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {goal.category && (
                          <span className="text-xs px-2 py-0.5 rounded bg-[rgba(0,255,102,0.15)] text-[#00FF66]">
                            {goal.category}
                          </span>
                        )}
                        <span className="text-xs text-[#9AA0A6]">
                          {goal.goalType === 'checklist' ? 'Checklist' : 'Acumulativa'}
                        </span>
                        {goal.dueDate && (
                          <span className="text-xs text-[#9AA0A6]">
                            Prazo: {format(parseISO(goal.dueDate), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="p-1 text-[#9AA0A6] hover:text-[#00FF66]">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); navigate(createPageUrl('CreateGoal') + `?edit=${goal.id}`); }}
                          className="text-[#E8E8E8] focus:bg-[rgba(0,255,102,0.1)]"
                        >
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); archiveMutation.mutate(goal.id); }}
                          className="text-[#E8E8E8] focus:bg-[rgba(0,255,102,0.1)]"
                        >
                          <Archive className="w-4 h-4 mr-2" /> Arquivar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); setDeleteId(goal.id); }}
                          className="text-[#FF3B3B] focus:bg-[rgba(255,59,59,0.1)]"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <OlimpoProgress 
                    value={progress.current} 
                    max={progress.total} 
                    showLabel={false}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-[#9AA0A6]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {progress.current}/{progress.total} {goal.unit || ''}
                    </span>
                    <span className="text-xs font-mono text-[#00FF66]">+{goal.xpOnComplete || 200} XP</span>
                  </div>

                  {/* Progress Button */}
                  {goal.status === 'active' && goal.goalType === 'accumulative' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        progressGoalMutation.mutate(goal);
                      }}
                      className="mt-3 w-full py-2 bg-[rgba(0,255,102,0.1)] border border-[rgba(0,255,102,0.3)] rounded-lg text-[#00FF66] text-sm font-semibold hover:bg-[rgba(0,255,102,0.15)] transition-all flex items-center justify-center gap-2"
                      disabled={progressGoalMutation.isPending}
                    >
                      <ChevronUp className="w-4 h-4" />
                      Avançar (+5 XP)
                    </button>
                  )}
                </OlimpoCard>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#E8E8E8]">Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#9AA0A6]">
              Essa ação não pode ser desfeita.
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

      <GoalLightningEffect show={showLightning} onComplete={() => setShowLightning(false)} />
    </div>
  );
}