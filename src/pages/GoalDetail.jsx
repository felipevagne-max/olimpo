import { useState, useEffect } from 'react';
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
import GoalActionSheet from '@/components/goals/GoalActionSheet';
import GoalLightningEffect from '@/components/goals/GoalLightningEffect';
import { XPGainManager, triggerXPGain } from '@/components/olimpo/XPGainEffect';
import { ArrowLeft, Check, Target, Calendar, Zap, Trophy, Plus, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';

export default function GoalDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const goalId = searchParams.get('id');
  const shouldComplete = searchParams.get('complete') === 'true';

  const [updateValue, setUpdateValue] = useState('');
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showLightning, setShowLightning] = useState(false);

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

  const { data: linkedTasks = [] } = useQuery({
    queryKey: ['linkedTasks', goalId],
    queryFn: async () => {
      const allTasks = await base44.entities.Task.list();
      return allTasks.filter(t => t.goalId === goalId);
    },
    enabled: !!goalId
  });

  const { data: linkedHabits = [] } = useQuery({
    queryKey: ['linkedHabits', goalId],
    queryFn: async () => {
      const allHabits = await base44.entities.Habit.list();
      return allHabits.filter(h => h.goalId === goalId);
    },
    enabled: !!goalId
  });

  // Auto-complete if coming from Goals page with complete=true
  useEffect(() => {
    if (shouldComplete && goal && !showLightning) {
      const progress = getProgress();
      if (progress.percent >= 100) {
        completeGoalMutation.mutate();
      }
    }
  }, [shouldComplete, goal, showLightning]);

  const updateProgressMutation = useMutation({
    mutationFn: async (newValue) => {
      const prevValue = goal?.currentValue || 0;
      
      // Check if crossing 100%
      const prevPercent = goal?.targetValue ? (prevValue / goal.targetValue) * 100 : 0;
      const newPercent = goal?.targetValue ? (newValue / goal.targetValue) * 100 : 0;
      const crossedCompletion = prevPercent < 100 && newPercent >= 100;
      
      if (crossedCompletion) {
        // Delete goal and award completion XP
        await base44.entities.Goal.update(goalId, { 
          deleted_at: new Date().toISOString(),
          status: 'completed',
          currentValue: newValue
        });
        
        const { awardXp } = await import('@/components/xpSystem');
        const sfxEnabled = userProfile?.sfxEnabled ?? true;
        
        await awardXp({
          amount: goal.xpOnComplete || 200,
          sourceType: 'goal',
          sourceId: goalId,
          note: `Meta concluída: ${goal.title}`,
          sfxEnabled
        });
        
        return { newValue, prevValue, xpGained: goal.xpOnComplete || 200, completed: true };
      } else {
        // Normal progress update
        await base44.entities.Goal.update(goalId, { currentValue: newValue });
        
        const { awardXp } = await import('@/components/xpSystem');
        const GOAL_PROGRESS_XP = 5;
        const sfxEnabled = userProfile?.sfxEnabled ?? true;
        
        await awardXp({
          amount: GOAL_PROGRESS_XP,
          sourceType: 'goal',
          sourceId: goalId,
          note: 'Progresso na meta',
          sfxEnabled
        });
        
        return { newValue, prevValue, xpGained: GOAL_PROGRESS_XP, completed: false };
      }
    },
    onSuccess: ({ completed, xpGained }) => {
      queryClient.invalidateQueries(['goal', goalId]);
      queryClient.invalidateQueries(['goals']);
      queryClient.invalidateQueries(['xpTransactions']);
      setUpdateValue('');
      
      // Trigger XP popup
      triggerXPGain(xpGained);
      
      if (completed) {
        // Show lightning effect and play sound
        setShowLightning(true);
        
        // Play 16-bit lightning sound
        const sfxEnabled = userProfile?.sfxEnabled ?? true;
        if (sfxEnabled) {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const playLightningSFX = () => {
            // 16-bit lightning/electric sound
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.15);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
          };
          
          playLightningSFX();
          setTimeout(playLightningSFX, 100);
        }
        
        // Navigate back after effect
        setTimeout(() => {
          navigate(createPageUrl('Goals'));
        }, 1500);
      }
    }
  });

  const toggleMilestoneMutation = useMutation({
    mutationFn: async (milestone) => {
      // Block uncomplete after confirmation
      if (milestone.completed) {
        toast.error('Conclusão confirmada. Não é possível desfazer.');
        throw new Error('Cannot uncomplete milestone');
      }
      
      const prevCompleted = milestones.filter(m => m.completed).length;
      
      await base44.entities.GoalMilestone.update(milestone.id, { 
        completed: true,
        completedAt: new Date().toISOString()
      });
      
      // Check if just crossed 100%
      const newCompleted = prevCompleted + 1;
      const totalMilestones = milestones.length;
      const prevPercent = totalMilestones > 0 ? (prevCompleted / totalMilestones) * 100 : 0;
      const newPercent = totalMilestones > 0 ? (newCompleted / totalMilestones) * 100 : 0;
      const crossedCompletion = prevPercent < 100 && newPercent >= 100;
      
      if (crossedCompletion) {
        // Delete goal and award completion XP
        await base44.entities.Goal.update(goalId, { 
          deleted_at: new Date().toISOString(),
          status: 'completed'
        });
        
        const { awardXp } = await import('@/components/xpSystem');
        const sfxEnabled = userProfile?.sfxEnabled ?? true;
        
        await awardXp({
          amount: goal.xpOnComplete || 200,
          sourceType: 'goal',
          sourceId: goalId,
          note: `Meta concluída: ${goal.title}`,
          sfxEnabled
        });
        
        return { xpGained: goal.xpOnComplete || 200, prevCompleted, completed: true };
      } else {
        // Award milestone XP
        const { awardXp } = await import('@/components/xpSystem');
        const sfxEnabled = userProfile?.sfxEnabled ?? true;
        
        await awardXp({
          amount: milestone.xpReward || 30,
          sourceType: 'milestone',
          sourceId: milestone.id,
          note: `Etapa: ${milestone.title}`,
          sfxEnabled
        });
        
        return { xpGained: milestone.xpReward || 30, prevCompleted, completed: false };
      }
    },
    onSuccess: ({ completed, xpGained }) => {
      queryClient.invalidateQueries(['milestones', goalId]);
      queryClient.invalidateQueries(['goal', goalId]);
      queryClient.invalidateQueries(['goals']);
      queryClient.invalidateQueries(['xpTransactions']);
      
      // Trigger XP popup
      triggerXPGain(xpGained);
      
      if (completed) {
        // Show lightning effect and play sound
        setShowLightning(true);
        
        // Play 16-bit lightning sound
        const sfxEnabled = userProfile?.sfxEnabled ?? true;
        if (sfxEnabled) {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const playLightningSFX = () => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.15);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
          };
          
          playLightningSFX();
          setTimeout(playLightningSFX, 100);
        }
        
        // Navigate back after effect
        setTimeout(() => {
          navigate(createPageUrl('Goals'));
        }, 1500);
      }
    }
  });

  const completeGoalMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Goal.update(goalId, { 
        deleted_at: new Date().toISOString(),
        status: 'completed'
      });
      
      const { awardXp } = await import('@/components/xpSystem');
      const sfxEnabled = userProfile?.sfxEnabled ?? true;
      
      await awardXp({
        amount: goal.xpOnComplete || 200,
        sourceType: 'goal',
        sourceId: goalId,
        note: `Meta concluída: ${goal.title}`,
        sfxEnabled
      });
      
      return goal.xpOnComplete || 200;
    },
    onSuccess: (xpGained) => {
      queryClient.invalidateQueries(['goal', goalId]);
      queryClient.invalidateQueries(['goals']);
      queryClient.invalidateQueries(['xpTransactions']);
      
      // Trigger XP popup
      triggerXPGain(xpGained);
      
      // Show lightning effect
      setShowLightning(true);
      
      // Play 16-bit lightning sound
      const sfxEnabled = userProfile?.sfxEnabled ?? true;
      if (sfxEnabled) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const playLightningSFX = () => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.15);
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.15);
        };
        
        playLightningSFX();
        setTimeout(playLightningSFX, 100);
      }
      
      // Navigate back after effect
      setTimeout(() => {
        navigate(createPageUrl('Goals'));
      }, 1500);
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

  // Track completion state (handled in mutations now)



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

        {/* Ações para avançar */}
        {goal.status !== 'completed' && (
          <OlimpoCard className="mb-4">
            <h3 className="text-sm font-semibold text-[#E8E8E8] mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Ações para avançar
            </h3>
            <p className="text-xs text-[#9AA0A6] mb-3">
              Crie tarefas ou hábitos ligados a esta meta
            </p>
            <OlimpoButton 
              className="w-full"
              onClick={() => setShowActionSheet(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Ação
            </OlimpoButton>

            {/* Linked Actions */}
            {(linkedTasks.length > 0 || linkedHabits.length > 0) && (
              <div className="mt-4 pt-4 border-t border-[rgba(0,255,102,0.08)]">
                <p className="text-xs text-[#9AA0A6] mb-2">Ações vinculadas</p>
                <div className="space-y-2">
                  {linkedTasks.map(task => (
                    <div 
                      key={task.id}
                      onClick={() => navigate(createPageUrl('Tasks'))}
                      className="flex items-center gap-2 p-2 bg-[#070A08] rounded-lg cursor-pointer hover:bg-[rgba(0,255,102,0.05)]"
                    >
                      <Calendar className="w-4 h-4 text-[#9AA0A6]" />
                      <span className={`text-xs flex-1 ${task.completed ? 'text-[#9AA0A6] line-through' : 'text-[#E8E8E8]'}`}>
                        {task.title}
                      </span>
                      {task.completed && <Check className="w-4 h-4 text-[#00FF66]" />}
                    </div>
                  ))}
                  {linkedHabits.map(habit => (
                    <div 
                      key={habit.id}
                      onClick={() => navigate(createPageUrl('Habits'))}
                      className="flex items-center gap-2 p-2 bg-[#070A08] rounded-lg cursor-pointer hover:bg-[rgba(0,255,102,0.05)]"
                    >
                      <CheckSquare className="w-4 h-4 text-[#9AA0A6]" />
                      <span className={`text-xs flex-1 ${habit.archived ? 'text-[#9AA0A6]' : 'text-[#E8E8E8]'}`}>
                        {habit.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

      <GoalActionSheet 
        open={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        goalId={goalId}
      />

      <GoalLightningEffect 
        show={showLightning}
        onComplete={() => setShowLightning(false)}
      />

      <XPGainManager />
    </div>
  );
}