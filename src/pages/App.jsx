import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BottomNav from '@/components/olimpo/BottomNav';
import TopBar from '@/components/olimpo/TopBar';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoProgress from '@/components/olimpo/OlimpoProgress';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import MatrixRain from '@/components/olimpo/MatrixRain';
import DashboardCharts from '@/components/olimpo/DashboardCharts';
import { XPGainManager, triggerXPGain } from '@/components/olimpo/XPGainEffect';
import { getLevelFromXP } from '@/components/olimpo/levelSystem';
import { Zap, Target, CheckSquare, Calendar, TrendingUp, Moon, Brain, Smile, Plus, Check, Lock, CheckCircle } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

function CheckInCompleted() {
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const diff = tomorrow - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="text-center p-4 bg-[rgba(0,255,102,0.1)] rounded-lg border border-[rgba(0,255,102,0.18)]">
      <CheckCircle className="w-8 h-8 text-[#00FF66] mx-auto mb-2" />
      <p className="text-sm text-[#00FF66] mb-1">Check-in realizado com sucesso</p>
      <p className="text-xs text-[#9AA0A6] mb-2">Próximo check-in em:</p>
      <p 
        className="text-2xl font-bold text-[#00FF66]"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      >
        {timeLeft}
      </p>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const currentMonth = format(new Date(), 'yyyy-MM');

  const [checkInData, setCheckInData] = useState({
    sleepScore: 5,
    productivityScore: 5,
    moodScore: 5
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  // Calculate date ranges once
  const monthStart = useMemo(() => startOfMonth(new Date()), []);
  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return format(d, 'yyyy-MM-dd');
  }, []);

  const { data: xpTransactions = [], isLoading: loadingXP } = useQuery({
    queryKey: ['xpTransactions', currentMonth],
    queryFn: () => base44.entities.XPTransaction.list('-created_date', 500),
    staleTime: 30000
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks', today, sevenDaysAgo],
    queryFn: async () => {
      const allTasks = await base44.entities.Task.list('-date', 200);
      // Filter only relevant tasks: today + last 7 days completed + overdue
      return allTasks.filter(t => {
        if (t.archived) return false;
        if (t.date === today) return true;
        if (t.completed && t.completedAt && t.completedAt >= sevenDaysAgo) return true;
        if (t.isOverdue && !t.completed) return true;
        return false;
      });
    },
    staleTime: 30000
  });

  const { data: habits = [], isLoading: loadingHabits } = useQuery({
    queryKey: ['habits'],
    queryFn: () => base44.entities.Habit.filter({ archived: false }),
    staleTime: 60000
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habitLogs', today, currentMonth],
    queryFn: async () => {
      const all = await base44.entities.HabitLog.list('-date', 300);
      // Only keep current month logs
      return all.filter(l => l.date && l.date >= format(monthStart, 'yyyy-MM-dd'));
    },
    staleTime: 30000
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    },
    staleTime: 300000
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list('-created_date', 100),
    staleTime: 60000
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkIns', currentMonth],
    queryFn: async () => {
      const all = await base44.entities.CheckIn.list('-date', 50);
      return all.filter(c => c.date && c.date >= format(monthStart, 'yyyy-MM-dd'));
    },
    staleTime: 60000
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', today],
    queryFn: async () => {
      const all = await base44.entities.Expense.filter({ deleted_at: null }, '-date', 100);
      return all.filter(e => e.date === today);
    },
    staleTime: 30000
  });

  const todayCheckIn = checkIns.find(c => c.date === today);
  const hasCheckedInToday = !!todayCheckIn;

  useEffect(() => {
    if (todayCheckIn) {
      setCheckInData({
        sleepScore: todayCheckIn.sleepScore || 5,
        productivityScore: todayCheckIn.productivityScore || 5,
        moodScore: todayCheckIn.moodScore || 5
      });
    }
  }, [todayCheckIn]);

  const saveCheckInMutation = useMutation({
    mutationFn: async (data) => {
      if (todayCheckIn) {
        toast.error('Você já registrou o check-in de hoje.');
        throw new Error('Check-in already done today');
      }
      
      const checkIn = await base44.entities.CheckIn.create({ ...data, date: today });
      
      // Award XP using centralized function
      const { awardXp } = await import('@/components/xpSystem');
      const CHECKIN_XP_REWARD = 15;
      const sfxEnabled = userProfile?.sfxEnabled ?? true;
      
      await awardXp({
        amount: CHECKIN_XP_REWARD,
        sourceType: 'checkin',
        sourceId: checkIn.id,
        note: 'Daily check-in',
        sfxEnabled
      });
      
      return { checkIn, xpGained: CHECKIN_XP_REWARD };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['checkIns']);
      queryClient.invalidateQueries(['xpTransactions']);
      toast.success(`Check-in registrado! +${data.xpGained} XP`);
    }
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (task) => {
      if (task.completed) {
        toast.error('Conclusão confirmada. Não é possível desfazer.');
        throw new Error('Cannot uncomplete task');
      }
      
      await base44.entities.Task.update(task.id, { 
        completed: true,
        completedAt: new Date().toISOString()
      });
      
      // Calculate XP with overdue multiplier
      const baseXP = task.xpReward || 10;
      const xpAmount = task.isOverdue ? Math.round(baseXP * 0.5) : baseXP;
      
      // Award XP using centralized function
      const { awardXp } = await import('@/components/xpSystem');
      const sfxEnabled = userProfile?.sfxEnabled ?? true;
      
      await awardXp({
        amount: xpAmount,
        sourceType: 'task',
        sourceId: task.id,
        note: task.isOverdue ? `Tarefa atrasada: ${task.title} (x0.5)` : `Tarefa: ${task.title}`,
        sfxEnabled
      });
      
      // Progress linked goal if exists
      if (task.goalId) {
        const goals = await base44.entities.Goal.list();
        const linkedGoal = goals.find(g => g.id === task.goalId);
        if (linkedGoal && linkedGoal.goalType === 'accumulative' && !linkedGoal.deleted_at) {
          const newValue = (linkedGoal.currentValue || 0) + 1;
          await base44.entities.Goal.update(linkedGoal.id, { currentValue: newValue });
        }
      }
      
      return xpAmount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['xpTransactions']);
      queryClient.invalidateQueries(['goals']);
    }
  });

  const completeHabitMutation = useMutation({
    mutationFn: async (habit) => {
      const existingLog = habitLogs.find(l => l.habitId === habit.id && l.date === today && l.completed);
      
      // Toggle: if already completed, uncomplete it
      if (existingLog) {
        const xpAmount = habit.xpReward || 8;
        const penaltyXP = xpAmount * 2;
        
        // Delete the log
        await base44.entities.HabitLog.delete(existingLog.id);
        
        // Remove double XP as penalty
        const { awardXp } = await import('@/components/xpSystem');
        const sfxEnabled = userProfile?.sfxEnabled ?? true;
        
        await awardXp({
          amount: -penaltyXP,
          sourceType: 'habit',
          sourceId: habit.id,
          note: `Hábito desmarcado: ${habit.name} (penalidade)`,
          sfxEnabled
        });

        // Regress linked goal if exists
        if (habit.goalId) {
          const goals = await base44.entities.Goal.list();
          const linkedGoal = goals.find(g => g.id === habit.goalId);
          if (linkedGoal && linkedGoal.goalType === 'accumulative' && !linkedGoal.deleted_at) {
            const newValue = Math.max(0, (linkedGoal.currentValue || 0) - 1);
            await base44.entities.Goal.update(linkedGoal.id, { currentValue: newValue });
          }
        }

        return { uncompleted: true, penaltyXP };
      }

      // Complete habit
      const xpAmount = habit.xpReward || 8;
      
      await base44.entities.HabitLog.create({
        habitId: habit.id,
        date: today,
        completed: true,
        xpEarned: xpAmount
      });

      // Award XP using centralized function
      const { awardXp } = await import('@/components/xpSystem');
      const sfxEnabled = userProfile?.sfxEnabled ?? true;
      
      await awardXp({
        amount: xpAmount,
        sourceType: 'habit',
        sourceId: habit.id,
        note: `Hábito: ${habit.name}`,
        sfxEnabled
      });

      // Progress linked goal if exists
      if (habit.goalId) {
        const goals = await base44.entities.Goal.list();
        const linkedGoal = goals.find(g => g.id === habit.goalId);
        if (linkedGoal && linkedGoal.goalType === 'accumulative' && !linkedGoal.deleted_at) {
          const newValue = (linkedGoal.currentValue || 0) + 1;
          await base44.entities.Goal.update(linkedGoal.id, { currentValue: newValue });
        }
      }

      return { uncompleted: false, xpAmount };
    },
    onMutate: async (habit) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['habitLogs']);
      
      // Snapshot previous value
      const previousLogs = queryClient.getQueryData(['habitLogs']);
      
      // Optimistically update
      const existingLog = habitLogs.find(l => l.habitId === habit.id && l.date === today && l.completed);
      
      if (existingLog) {
        // Remove log optimistically
        queryClient.setQueryData(['habitLogs'], old => old.filter(l => l.id !== existingLog.id));
      } else {
        // Add log optimistically
        const optimisticLog = {
          id: `temp-${Date.now()}`,
          habitId: habit.id,
          date: today,
          completed: true,
          xpEarned: habit.xpReward || 8
        };
        queryClient.setQueryData(['habitLogs'], old => [...old, optimisticLog]);
      }
      
      return { previousLogs };
    },
    onError: (err, habit, context) => {
      // Rollback on error
      queryClient.setQueryData(['habitLogs'], context.previousLogs);
    },
    onSettled: ({ uncompleted, penaltyXP, xpAmount }) => {
      queryClient.invalidateQueries(['habitLogs']);
      queryClient.invalidateQueries(['xpTransactions']);
      queryClient.invalidateQueries(['goals']);
      
      if (uncompleted) {
        toast.error(`Hábito desmarcado! -${penaltyXP} XP (penalidade dobrada)`, {
          style: { background: '#FF3B3B', color: '#fff' }
        });
      }
    }
  });

  // Calculations (memoized for performance)
  const totalXP = useMemo(() => 
    xpTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
    [xpTransactions]
  );
  const levelInfo = useMemo(() => getLevelFromXP(totalXP), [totalXP]);

  const monthlyXP = useMemo(() => 
    xpTransactions
      .filter(t => t.created_date?.startsWith(currentMonth))
      .reduce((sum, t) => sum + (t.amount || 0), 0),
    [xpTransactions, currentMonth]
  );
  const monthlyTargetXP = userProfile?.monthlyTargetXP || 2000;
  const monthlyProgress = (monthlyXP / monthlyTargetXP) * 100;

  const todayTasks = useMemo(() => 
    tasks.filter(t => t.date === today && !t.completed),
    [tasks, today]
  );
  const completedTodayTasks = useMemo(() => 
    tasks.filter(t => t.date === today && t.completed),
    [tasks, today]
  );
  const todayHabitLogs = useMemo(() => 
    habitLogs.filter(l => l.date === today && l.completed),
    [habitLogs, today]
  );
  const activeGoals = useMemo(() => 
    goals.filter(g => g.status === 'active'),
    [goals]
  );
  const completedGoals = useMemo(() => 
    goals.filter(g => g.status === 'completed'),
    [goals]
  );

  const todayXP = useMemo(() => 
    xpTransactions
      .filter(t => t.created_date?.startsWith(today))
      .reduce((sum, t) => sum + (t.amount || 0), 0),
    [xpTransactions, today]
  );

  // Month calculations (memoized)
  const now = useMemo(() => new Date(), []);
  const monthName = useMemo(() => format(now, 'MMMM', { locale: ptBR }), [now]);
  const year = useMemo(() => format(now, 'yyyy'), [now]);

  // A) HÁBITOS - Nota 0-10 (memoized)
  const { expectedHabits, doneHabits } = useMemo(() => {
    const monthDays = [];
    for (let d = new Date(monthStart); d <= now; d.setDate(d.getDate() + 1)) {
      monthDays.push(format(d, 'yyyy-MM-dd'));
    }

    let expected = 0;
    monthDays.forEach(day => {
      const dayOfWeek = format(new Date(day), 'EEE', { locale: ptBR }).toLowerCase();
      habits.forEach(habit => {
        if (habit.frequencyType === 'daily') {
          expected++;
        } else if (habit.frequencyType === 'weekdays' && habit.weekdays?.includes(dayOfWeek)) {
          expected++;
        }
      });
    });

    const done = habitLogs.filter(l => l.completed).length;

    return { expectedHabits: expected, doneHabits: done };
  }, [habits, habitLogs, monthStart, now]);

  const habitCompletionRate = useMemo(() => 
    expectedHabits > 0 ? doneHabits / expectedHabits : 0,
    [expectedHabits, doneHabits]
  );
  const habitScore = useMemo(() => 
    expectedHabits > 0 ? Math.round(10 * habitCompletionRate) : null,
    [expectedHabits, habitCompletionRate]
  );

  // B) EXECUÇÃO ON - Nota 0-10 (memoized)
  const { monthTasks, doneTasks, totalTasks } = useMemo(() => {
    const filtered = tasks.filter(t => {
      if (t.archived) return false;
      const taskDate = new Date(t.date);
      return taskDate >= monthStart && taskDate <= now;
    });
    return {
      monthTasks: filtered,
      doneTasks: filtered.filter(t => t.completed).length,
      totalTasks: filtered.length
    };
  }, [tasks, monthStart, now]);
  const taskCompletionRate = useMemo(() => 
    totalTasks > 0 ? doneTasks / totalTasks : 0,
    [doneTasks, totalTasks]
  );
  
  const overduePendingTasks = useMemo(() => 
    monthTasks.filter(t => !t.completed && t.isOverdue).length,
    [monthTasks]
  );
  const overduePenalty = useMemo(() => 
    Math.min(2, overduePendingTasks / 5),
    [overduePendingTasks]
  );
  const executionScore = useMemo(() => 
    totalTasks > 0 ? Math.max(0, Math.round(10 * taskCompletionRate) - overduePenalty) : null,
    [totalTasks, taskCompletionRate, overduePenalty]
  );

  // C) METAS DO MÊS - Percentual (memoized)
  const goalsInMonth = useMemo(() => 
    goals.filter(g => {
      if (g.status === 'archived') return false;
      if (g.dueDate) {
        const dueDate = new Date(g.dueDate);
        return dueDate >= monthStart && dueDate <= endOfDay(now);
      }
      const createdDate = new Date(g.created_date);
      return createdDate >= monthStart && createdDate <= endOfDay(now);
    }),
    [goals, monthStart, now]
  );

  const completedGoalsMonth = useMemo(() => 
    goalsInMonth.filter(g => g.status === 'completed').length,
    [goalsInMonth]
  );
  const totalGoalsMonth = goalsInMonth.length;
  const goalsPercent = useMemo(() => 
    totalGoalsMonth > 0 ? Math.round(100 * completedGoalsMonth / totalGoalsMonth) : null,
    [totalGoalsMonth, completedGoalsMonth]
  );

  // D) XP NO MÊS (memoized and optimized)
  const xpMonth = useMemo(() => 
    xpTransactions
      .filter(t => t.created_date?.startsWith(currentMonth))
      .reduce((sum, t) => sum + (t.amount || 0), 0),
    [xpTransactions, currentMonth]
  );

  // BEM-ESTAR MÉDIO (already filtered in query)
  const monthCheckIns = checkIns;

  const avgSleep = useMemo(() => 
    monthCheckIns.length > 0
      ? (monthCheckIns.reduce((sum, c) => sum + (c.sleepScore || 0), 0) / monthCheckIns.length).toFixed(1)
      : null,
    [monthCheckIns]
  );
  const avgProductivity = useMemo(() => 
    monthCheckIns.length > 0
      ? (monthCheckIns.reduce((sum, c) => sum + (c.productivityScore || 0), 0) / monthCheckIns.length).toFixed(1)
      : null,
    [monthCheckIns]
  );
  const avgMood = useMemo(() => 
    monthCheckIns.length > 0
      ? (monthCheckIns.reduce((sum, c) => sum + (c.moodScore || 0), 0) / monthCheckIns.length).toFixed(1)
      : null,
    [monthCheckIns]
  );

  const isLoading = loadingXP || loadingTasks || loadingHabits;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 lg:pb-0 lg:pl-64 relative">
      <TopBar />
      <MatrixRain opacity={0.05} side="left" />
      
      <div className="relative z-10 px-4 pt-20 olimpo-container lg:px-8">
        {/* Welcome & Level Progress */}
        <div className="mb-6">
          <p className="text-[#9AA0A6] text-sm">Bem-vindo,</p>
          <h1 
            className="text-2xl font-bold text-[#00FF66] mb-4"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {user?.full_name || 'Herói'}
          </h1>
          
          <OlimpoCard>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#00FF66]" />
                <span className="text-xs text-[#9AA0A6]">Progresso para {levelInfo.levelIndex < 6 ? getLevelFromXP(totalXP + levelInfo.xpToNextLevel).levelName : 'nível máximo'}</span>
              </div>
              <span className="text-xs font-mono text-[#00FF66]">{totalXP} XP</span>
            </div>
            <OlimpoProgress 
              value={levelInfo.xpCurrentLevel} 
              max={levelInfo.xpCurrentLevel + levelInfo.xpToNextLevel} 
              showLabel={false}
            />
            {levelInfo.xpToNextLevel > 0 && (
              <p className="text-xs text-[#9AA0A6] mt-1 text-right">
                Faltam {levelInfo.xpToNextLevel} XP
              </p>
            )}
          </OlimpoCard>
        </div>

        {/* MÊS ATUAL - 4 Boxes */}
        <div className="mb-6">
          <h2 
            className="text-lg font-bold text-[#00FF66] mb-1"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            MÊS ATUAL
          </h2>
          <p className="text-xs text-[#9AA0A6] mb-4">
            {monthName.charAt(0).toUpperCase() + monthName.slice(1)}, {year} (até hoje)
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-4">
            {/* A) Hábitos */}
            <OlimpoCard className="border-[rgba(191,255,74,0.2)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[rgba(191,255,74,0.6)]" />
                <span className="text-xs text-[#9AA0A6]">HÁBITOS</span>
              </div>
              <p 
                className="text-3xl font-bold text-[#E8E8E8]"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {habitScore !== null ? `${habitScore}/10` : '—/10'}
              </p>
              {habitScore === null && (
                <p className="text-[9px] text-[#9AA0A6] mt-1">Sem hábitos ativos neste mês</p>
              )}
            </OlimpoCard>

            {/* B) Execução ON */}
            <OlimpoCard className="border-[rgba(0,255,200,0.2)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[rgba(0,255,200,0.6)]" />
                <span className="text-xs text-[#9AA0A6]">EXECUÇÃO ON</span>
              </div>
              <p 
                className="text-3xl font-bold text-[#E8E8E8]"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {executionScore !== null ? `${executionScore}/10` : '—/10'}
              </p>
              {executionScore === null && (
                <p className="text-[9px] text-[#9AA0A6] mt-1">Sem tarefas no mês</p>
              )}
            </OlimpoCard>

            {/* C) Metas do Mês */}
            <OlimpoCard className="border-[rgba(124,92,255,0.2)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[rgba(124,92,255,0.6)]" />
                <span className="text-xs text-[#9AA0A6]">METAS DO MÊS</span>
              </div>
              <p 
                className="text-3xl font-bold text-[#E8E8E8]"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {goalsPercent !== null ? `${goalsPercent}%` : '—%'}
              </p>
              {goalsPercent === null && (
                <p className="text-[9px] text-[#9AA0A6] mt-1">Sem metas deste mês</p>
              )}
            </OlimpoCard>

            {/* D) XP no Mês */}
            <OlimpoCard className="border-[rgba(255,212,0,0.2)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[rgba(255,212,0,0.6)]" />
                <span className="text-xs text-[#9AA0A6]">XP NO MÊS</span>
              </div>
              <p 
                className="text-3xl font-bold text-[#E8E8E8]"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                +{xpMonth}
              </p>
            </OlimpoCard>
          </div>

          {/* BEM-ESTAR MÉDIO */}
          <OlimpoCard className="lg:col-span-2 lg:mx-auto lg:max-w-2xl lg:w-full">
            <h3 
              className="text-sm font-semibold text-[#E8E8E8] mb-3"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              BEM-ESTAR MÉDIO (MÊS)
            </h3>
            {avgSleep !== null ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-[#00FF66]" />
                    <span className="text-xs text-[#9AA0A6]">Sono</span>
                  </div>
                  <span 
                    className="text-sm font-bold text-[#E8E8E8]"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {avgSleep}/10
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-[#00FF66]" />
                    <span className="text-xs text-[#9AA0A6]">Produtividade</span>
                  </div>
                  <span 
                    className="text-sm font-bold text-[#E8E8E8]"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {avgProductivity}/10
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smile className="w-4 h-4 text-[#00FF66]" />
                    <span className="text-xs text-[#9AA0A6]">Humor</span>
                  </div>
                  <span 
                    className="text-sm font-bold text-[#E8E8E8]"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {avgMood}/10
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#9AA0A6] text-center py-4">
                Faça check-in para gerar média do mês
              </p>
            )}
          </OlimpoCard>
        </div>

        {/* Quick Stats */}
        <OlimpoCard className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#00FF66]" />
            <span className="text-xs text-[#9AA0A6]">Meta Mensal de XP</span>
          </div>
          <OlimpoProgress value={monthlyXP} max={monthlyTargetXP} />
          <p className="text-xs text-[#9AA0A6] mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {monthlyXP}/{monthlyTargetXP} XP ({((monthlyXP/monthlyTargetXP)*100).toFixed(0)}%)
          </p>
        </OlimpoCard>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <OlimpoCard className="p-3 text-center">
            <CheckSquare className="w-5 h-5 text-[#00FF66] mx-auto mb-1" />
            <p className="text-lg font-bold text-[#E8E8E8]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {todayHabitLogs.length}/{habits.length}
            </p>
            <p className="text-[10px] text-[#9AA0A6]">Hábitos</p>
          </OlimpoCard>

          <OlimpoCard className="p-3 text-center">
            <Calendar className="w-5 h-5 text-[#00FF66] mx-auto mb-1" />
            <p className="text-lg font-bold text-[#E8E8E8]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {completedTodayTasks.length}/{todayTasks.length + completedTodayTasks.length}
            </p>
            <p className="text-[10px] text-[#9AA0A6]">Tarefas</p>
          </OlimpoCard>

          <OlimpoCard className="p-3 text-center">
            <Target className="w-5 h-5 text-[#00FF66] mx-auto mb-1" />
            <p className="text-lg font-bold text-[#E8E8E8]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {activeGoals.length}/{completedGoals.length}
            </p>
            <p className="text-[10px] text-[#9AA0A6]">Metas</p>
          </OlimpoCard>

          <OlimpoCard className="p-3 text-center">
            <Zap className="w-5 h-5 text-[#00FF66] mx-auto mb-1" />
            <p className="text-lg font-bold text-[#00FF66]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              +{todayXP}
            </p>
            <p className="text-[10px] text-[#9AA0A6]">XP Hoje</p>
          </OlimpoCard>
        </div>

        {/* Evolution Charts */}
        <DashboardCharts />

        {/* Check-in */}
        <OlimpoCard className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 
              className="text-sm font-semibold text-[#E8E8E8]"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Check-in Diário
            </h3>
            {hasCheckedInToday && (
              <div className="flex items-center gap-1 text-xs text-[#00FF66]">
                <Lock className="w-3 h-3" />
                <span>Registrado</span>
              </div>
            )}
          </div>
          
          {hasCheckedInToday ? (
            <CheckInCompleted />
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-[#00FF66]" />
                    <span className="text-xs text-[#9AA0A6]">Sono</span>
                  </div>
                  <span className="text-sm font-mono text-[#00FF66]">{checkInData.sleepScore}</span>
                </div>
                <Slider
                  value={[checkInData.sleepScore]}
                  onValueChange={([v]) => setCheckInData(prev => ({ ...prev, sleepScore: v }))}
                  max={10}
                  step={1}
                  className="[&_[role=slider]]:bg-[#00FF66] [&_[role=slider]]:border-0 [&_.bg-primary]:bg-[#00FF66]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-[#00FF66]" />
                    <span className="text-xs text-[#9AA0A6]">Produtividade</span>
                  </div>
                  <span className="text-sm font-mono text-[#00FF66]">{checkInData.productivityScore}</span>
                </div>
                <Slider
                  value={[checkInData.productivityScore]}
                  onValueChange={([v]) => setCheckInData(prev => ({ ...prev, productivityScore: v }))}
                  max={10}
                  step={1}
                  className="[&_[role=slider]]:bg-[#00FF66] [&_[role=slider]]:border-0 [&_.bg-primary]:bg-[#00FF66]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Smile className="w-4 h-4 text-[#00FF66]" />
                    <span className="text-xs text-[#9AA0A6]">Humor</span>
                  </div>
                  <span className="text-sm font-mono text-[#00FF66]">{checkInData.moodScore}</span>
                </div>
                <Slider
                  value={[checkInData.moodScore]}
                  onValueChange={([v]) => setCheckInData(prev => ({ ...prev, moodScore: v }))}
                  max={10}
                  step={1}
                  className="[&_[role=slider]]:bg-[#00FF66] [&_[role=slider]]:border-0 [&_.bg-primary]:bg-[#00FF66]"
                />
              </div>

              <OlimpoButton
                onClick={() => saveCheckInMutation.mutate(checkInData)}
                className="w-full"
                disabled={saveCheckInMutation.isPending}
              >
                {saveCheckInMutation.isPending ? 'Salvando...' : 'Salvar Check-in (+15 XP)'}
              </OlimpoButton>
            </div>
          )}
        </OlimpoCard>

        {/* Today's Todo (Tasks + Habits) */}
        <OlimpoCard>
          <div className="flex items-center justify-between mb-4">
            <h3 
              className="text-sm font-semibold text-[#E8E8E8]"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Todo de Hoje
            </h3>
            <OlimpoButton 
              variant="ghost" 
              className="h-8 px-2"
              onClick={() => navigate(createPageUrl('Tasks'))}
            >
              <Plus className="w-4 h-4 mr-1" />
              Nova
            </OlimpoButton>
          </div>

          {(() => {
           const incompleteTasks = todayTasks;

           // Get ALL today's habits (completed and pending)
           const todayWeekday = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][new Date().getDay()];
           const todayHabitsAll = habits.filter(habit => {
             if (habit.archived) return false;

             // Check if habit is valid for today
             if (habit.frequencyType === 'daily') return true;
             if (habit.frequencyType === 'weekdays' && habit.weekdays?.includes(todayWeekday)) return true;
             if (habit.frequencyType === 'timesPerWeek') return true;
             return false;
           }).map(habit => {
             const completedToday = habitLogs.find(l => l.habitId === habit.id && l.date === today && l.completed);
             return { ...habit, completedToday: !!completedToday };
           });

           // Get ALL today's financial movements (already filtered in query)
           const todayExpenses = expenses;

           const allItems = [
             ...incompleteTasks.map(t => ({ ...t, type: 'task', completed: false })),
             ...completedTodayTasks.map(t => ({ ...t, type: 'task', completed: true })),
             ...todayHabitsAll.map(h => ({ ...h, type: 'habit', completed: h.completedToday })),
             ...todayExpenses.map(e => ({ ...e, type: 'payment', completed: e.status === 'pago' }))
           ];

            return allItems.length === 0 ? (
              <p className="text-sm text-[#9AA0A6] text-center py-4">
                Tudo concluído! 🎯
              </p>
            ) : (
              <div className="space-y-2">
                {allItems.map(item => (
                  <div 
                    key={
                      item.type === 'task' ? `task-${item.id}` : 
                      item.type === 'habit' ? `habit-${item.id}` :
                      `payment-${item.id}`
                    }
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      item.type === 'task' && item.isOverdue
                        ? 'bg-[rgba(255,59,59,0.05)] border-[rgba(255,59,59,0.3)]'
                        : item.completed
                        ? 'bg-[rgba(0,255,102,0.05)] border-[rgba(0,255,102,0.2)]'
                        : 'bg-[#070A08] border-[rgba(0,255,102,0.1)]'
                    }`}
                  >
                    {item.type !== 'payment' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.type === 'task') {
                            completeTaskMutation.mutate(item);
                          } else {
                            completeHabitMutation.mutate(item);
                          }
                        }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          item.completed
                            ? 'bg-[#00FF66] border-[#00FF66]'
                            : 'border-[#9AA0A6] hover:border-[#00FF66]'
                        }`}
                      >
                        {item.completed && <Check className="w-3 h-3 text-black" />}
                      </button>
                    ) : (
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        item.completed ? 'bg-[#00FF66] border-[#00FF66]' : 'border-[#FFC107]'
                      }`}>
                        {item.completed && <Check className="w-3 h-3 text-black" />}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className={`text-sm ${item.completed ? 'text-[#9AA0A6] line-through' : 'text-[#E8E8E8]'}`}>
                        {item.type === 'task' ? item.title : item.type === 'habit' ? item.name : item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.type === 'habit' && (
                          <span className="text-xs px-2 py-0.5 rounded bg-[rgba(0,255,102,0.15)] text-[#9AA0A6]">
                            Rotina
                          </span>
                        )}
                        {item.type === 'payment' && (
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            item.completed 
                              ? 'bg-[rgba(0,255,102,0.2)] text-[#00FF66]'
                              : 'bg-[rgba(255,193,7,0.2)] text-[#FFC107]'
                          }`}>
                            {item.type === 'receita' ? 'Receita' : 'Despesa'} • {item.completed ? 'Pago' : 'Programado'}
                          </span>
                        )}
                        {item.type === 'task' && item.isOverdue && (
                          <span className="text-xs px-2 py-0.5 rounded bg-[rgba(255,59,59,0.2)] text-[#FF3B3B] font-semibold">
                            ATRASADA
                          </span>
                        )}
                        {item.type === 'task' && item.priority && (
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            item.priority === 'high' ? 'bg-[rgba(255,59,59,0.2)] text-[#FF3B3B]' :
                            item.priority === 'medium' ? 'bg-[rgba(255,193,7,0.2)] text-[#FFC107]' :
                            'bg-[rgba(0,255,102,0.2)] text-[#00FF66]'
                          }`}>
                            {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Média' : 'Baixa'}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.type === 'payment' ? (
                      <span className="text-xs font-mono" style={{ color: item.type === 'receita' ? '#00FF66' : '#FF3B3B' }}>
                        {item.type === 'receita' ? '+' : '-'}R$ {item.amount?.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-[#00FF66] font-mono">
                        +{item.type === 'task' 
                          ? (item.isOverdue ? Math.round((item.xpReward || 10) * 0.5) : (item.xpReward || 10))
                          : (item.xpReward || 8)
                        }
                      </span>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </OlimpoCard>
      </div>

      <XPGainManager />
      <BottomNav />
    </div>
  );
}