import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import OlimpoProgress from '@/components/olimpo/OlimpoProgress';
import OlimpoInput from '@/components/olimpo/OlimpoInput';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import { XPGainManager, triggerXPGain } from '@/components/olimpo/XPGainEffect';
import { ArrowLeft, Check, Target, Calendar, Zap, Trophy } from 'lucide-react';
import { toast } from 'sonner';

export default function GoalDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const goalId = searchParams.get('id');

  const [updateValue, setUpdateValue] = useState('');

  const { data: goal, isLoading } = useQuery({
    queryKey: ['goal', goalId],
    queryFn: async () => {
      const goals = await base44.entities.Goal.list();
      return goals.find(g => g.id === goalId);
    },
    enabled: !!goalId
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', goalId],
    queryFn: () => base44.entities.GoalMilestone.filter({ goalId }),
    enabled: !!goalId
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    }
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (newValue) => {
      return base44.entities.Goal.update(goalId, { currentValue: newValue });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['goal', goalId]);
      setUpdateValue('');
    }
  });

  const toggleMilestoneMutation = useMutation({
    mutationFn: async (milestone) => {
      // Block uncomplete after confirmation
      if (milestone.completed) {
        toast.error('Conclusão confirmada. Não é possível desfazer.');
        throw new Error('Cannot uncomplete milestone');
      }
      
      await base44.entities.GoalMilestone.update(milestone.id, { 
        completed: true,
        completedAt: new Date().toISOString()
      });
      
      await base44.entities.XPTransaction.create({
        sourceType: 'milestone',
        sourceId: milestone.id,
        amount: milestone.xpReward || 30,
        note: `Etapa: ${milestone.title}`
      });
      
      return milestone.xpReward || 30;
    },
    onSuccess: (xpGained) => {
      queryClient.invalidateQueries(['milestones', goalId]);
      queryClient.invalidateQueries(['xpTransactions']);
      
      // Trigger XP gain effect
      const sfxEnabled = userProfile?.sfxEnabled ?? true;
      triggerXPGain(xpGained, sfxEnabled);
    }
  });

  const completeGoalMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Goal.update(goalId, { status: 'completed' });
      await base44.entities.XPTransaction.create({
        sourceType: 'goal',
        sourceId: goalId,
        amount: goal.xpOnComplete || 200,
        note: `Meta concluída: ${goal.title}`
      });
      
      return goal.xpOnComplete || 200;
    },
    onSuccess: (xpGained) => {
      queryClient.invalidateQueries(['goal', goalId]);
      queryClient.invalidateQueries(['goals']);
      queryClient.invalidateQueries(['xpTransactions']);
      
      // Trigger XP gain effect
      const sfxEnabled = userProfile?.sfxEnabled ?? true;
      triggerXPGain(xpGained, sfxEnabled);
      
      toast.success(`Meta concluída! +${xpGained} XP`);
    }
  });

  if (isLoading || !goal) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const getProgress = () => {
    if (goal.goalType === 'checklist') {
      const completed = milestones.filter(m => m.completed).length;
      return {
        current: completed,
        total: milestones.length,
        percent: milestones.length > 0 ? (completed / milestones.length) * 100 : 0
      };
    }
    return {
      current: goal.currentValue || 0,
      total: goal.targetValue || 100,
      percent: goal.targetValue ? ((goal.currentValue || 0) / goal.targetValue) * 100 : 0
    };
  };

  const progress = getProgress();
  const isComplete = progress.percent >= 100;

  return (
    <div className="min-h-screen bg-black pb-8">
      <div className="px-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate(createPageUrl('Goals'))}
            className="p-2 text-[#9AA0A6] hover:text-[#00FF66]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 
              className="text-xl font-bold text-[#00FF66]"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {goal.title}
            </h1>
            {goal.category && (
              <span className="text-xs px-2 py-0.5 rounded bg-[rgba(0,255,102,0.15)] text-[#00FF66]">
                {goal.category}
              </span>
            )}
          </div>
        </div>

        {/* Status Card */}
        <OlimpoCard className="mb-4" glow={goal.status === 'completed'}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              goal.status === 'completed' 
                ? 'bg-[rgba(0,255,102,0.2)]' 
                : 'bg-[rgba(0,255,102,0.1)]'
            }`}>
              {goal.status === 'completed' ? (
                <Trophy className="w-7 h-7 text-[#00FF66]" />
              ) : (
                <Target className="w-7 h-7 text-[#00FF66]" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-[#9AA0A6]">
                {goal.status === 'completed' ? 'Meta Concluída!' : 'Em Progresso'}
              </p>
              <p className="text-2xl font-bold text-[#00FF66]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {progress.percent.toFixed(0)}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#9AA0A6]">XP</p>
              <p className="text-lg font-bold text-[#00FF66]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                +{goal.xpOnComplete || 200}
              </p>
            </div>
          </div>

          <OlimpoProgress value={progress.current} max={progress.total} />
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[#9AA0A6]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {progress.current}/{progress.total} {goal.unit || ''}
            </span>
            {goal.dueDate && (
              <div className="flex items-center gap-1 text-xs text-[#9AA0A6]">
                <Calendar className="w-3 h-3" />
                {format(parseISO(goal.dueDate), 'dd/MM/yyyy')}
              </div>
            )}
          </div>
        </OlimpoCard>

        {/* Description */}
        {goal.description && (
          <OlimpoCard className="mb-4">
            <p className="text-sm text-[#9AA0A6]">{goal.description}</p>
          </OlimpoCard>
        )}

        {/* Update Progress (Accumulative) */}
        {goal.goalType === 'accumulative' && goal.status !== 'completed' && (
          <OlimpoCard className="mb-4">
            <h3 className="text-sm font-semibold text-[#E8E8E8] mb-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Atualizar Progresso
            </h3>
            <div className="flex gap-2">
              <OlimpoInput
                type="number"
                value={updateValue}
                onChange={(e) => setUpdateValue(e.target.value)}
                placeholder={`Novo valor (atual: ${goal.currentValue || 0})`}
              />
              <OlimpoButton 
                onClick={() => updateProgressMutation.mutate(parseInt(updateValue) || 0)}
                disabled={!updateValue || updateProgressMutation.isPending}
              >
                Atualizar
              </OlimpoButton>
            </div>
          </OlimpoCard>
        )}

        {/* Milestones (Checklist) */}
        {goal.goalType === 'checklist' && milestones.length > 0 && (
          <OlimpoCard className="mb-4">
            <h3 className="text-sm font-semibold text-[#E8E8E8] mb-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Etapas
            </h3>
            <div className="space-y-2">
              {milestones.map(milestone => (
                <div 
                  key={milestone.id}
                  className="flex items-center gap-3 p-3 bg-[#070A08] rounded-lg"
                >
                  <button
                    onClick={() => toggleMilestoneMutation.mutate(milestone)}
                    disabled={goal.status === 'completed'}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      milestone.completed 
                        ? 'bg-[#00FF66] border-[#00FF66]' 
                        : 'border-[#9AA0A6] hover:border-[#00FF66]'
                    }`}
                  >
                    {milestone.completed && <Check className="w-3 h-3 text-black" />}
                  </button>
                  <span className={`flex-1 text-sm ${milestone.completed ? 'text-[#9AA0A6] line-through' : 'text-[#E8E8E8]'}`}>
                    {milestone.title}
                  </span>
                  <span className="text-xs font-mono text-[#00FF66]">+{milestone.xpReward || 30}</span>
                </div>
              ))}
            </div>
          </OlimpoCard>
        )}

        {/* Complete Goal Button */}
        {isComplete && goal.status !== 'completed' && (
          <OlimpoButton 
            className="w-full"
            onClick={() => completeGoalMutation.mutate()}
            disabled={completeGoalMutation.isPending}
          >
            <Trophy className="w-4 h-4 mr-2" />
            Concluir Meta (+{goal.xpOnComplete || 200} XP)
          </OlimpoButton>
        )}
      </div>

      <XPGainManager />
    </div>
  );
}