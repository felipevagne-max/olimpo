import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BottomNav from '@/components/olimpo/BottomNav';
import TopBar, { getLevelFromXP } from '@/components/olimpo/TopBar';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoProgress from '@/components/olimpo/OlimpoProgress';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import MatrixRain from '@/components/olimpo/MatrixRain';
import DashboardCharts from '@/components/olimpo/DashboardCharts';
import { XPGainManager, triggerXPGain } from '@/components/olimpo/XPGainEffect';
import { getLevelFromXP } from '@/utils/levelSystem';
import { Zap, Target, CheckSquare, Calendar, TrendingUp, Moon, Brain, Smile, Plus, Check, Lock } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

export default function Dashboard() {
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

  const { data: xpTransactions = [], isLoading: loadingXP } = useQuery({
    queryKey: ['xpTransactions'],
    queryFn: () => base44.entities.XPTransaction.list()
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list()
  });

  const { data: habits = [], isLoading: loadingHabits } = useQuery({
    queryKey: ['habits'],
    queryFn: () => base44.entities.Habit.filter({ archived: false })
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habitLogs'],
    queryFn: () => base44.entities.HabitLog.list()
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list()
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkIns'],
    queryFn: () => base44.entities.CheckIn.list()
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    }
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
      // Block if already checked in today
      if (todayCheckIn) {
        toast.error('Você já registrou o check-in de hoje.');
        throw new Error('Check-in already done today');
      }
      
      const checkIn = await base44.entities.CheckIn.create({ ...data, date: today });
      
      // Award XP for daily check-in
      const CHECKIN_XP_REWARD = 15;
      await base44.entities.XPTransaction.create({
        sourceType: 'checkin',
        sourceId: checkIn.id,
        amount: CHECKIN_XP_REWARD,
        note: 'Daily check-in'
      });
      
      return { checkIn, xpGained: CHECKIN_XP_REWARD };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['checkIns']);
      queryClient.invalidateQueries(['xpTransactions']);
      
      // Trigger XP gain effect
      const sfxEnabled = userProfile?.sfxEnabled ?? true;
      triggerXPGain(data.xpGained, sfxEnabled);
      
      toast.success(`Check-in registrado! +${data.xpGained} XP`);
    }
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (task) => {
      // Block uncomplete after confirmation
      if (task.completed) {
        toast.error('Conclusão confirmada. Não é possível desfazer.');
        throw new Error('Cannot uncomplete task');
      }
      
      await base44.entities.Task.update(task.id, { 
        completed: true,
        completedAt: new Date().toISOString()
      });
      
      await base44.entities.XPTransaction.create({
        sourceType: 'task',
        sourceId: task.id,
        amount: task.xpReward || 10,
        note: `Tarefa: ${task.title}`
      });
      
      return task.xpReward || 10;
    },
    onSuccess: (xpGained) => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['xpTransactions']);
      
      // Trigger XP gain effect
      const sfxEnabled = userProfile?.sfxEnabled ?? true;
      triggerXPGain(xpGained, sfxEnabled);
    }
  });

  // Calculations
  const totalXP = xpTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const levelInfo = getLevelFromXP(totalXP);

  const monthlyXP = xpTransactions
    .filter(t => t.created_date?.startsWith(currentMonth))
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const monthlyTargetXP = userProfile?.monthlyTargetXP || 2000;
  const monthlyProgress = (monthlyXP / monthlyTargetXP) * 100;

  const todayTasks = tasks.filter(t => t.date === today && !t.archived);
  const completedTodayTasks = todayTasks.filter(t => t.completed);
  const todayHabitLogs = habitLogs.filter(l => l.date === today && l.completed);
  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  const todayXP = xpTransactions
    .filter(t => t.created_date?.startsWith(today))
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const isLoading = loadingXP || loadingTasks || loadingHabits;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 relative">
      <TopBar />
      <MatrixRain opacity={0.05} side="left" />
      
      <div className="relative z-10 px-4 pt-20">
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
              {completedTodayTasks.length}/{todayTasks.length}
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
                onValueChange={([v]) => !hasCheckedInToday && setCheckInData(prev => ({ ...prev, sleepScore: v }))}
                max={10}
                step={1}
                disabled={hasCheckedInToday}
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
                onValueChange={([v]) => !hasCheckedInToday && setCheckInData(prev => ({ ...prev, productivityScore: v }))}
                max={10}
                step={1}
                disabled={hasCheckedInToday}
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
                onValueChange={([v]) => !hasCheckedInToday && setCheckInData(prev => ({ ...prev, moodScore: v }))}
                max={10}
                step={1}
                disabled={hasCheckedInToday}
                className="[&_[role=slider]]:bg-[#00FF66] [&_[role=slider]]:border-0 [&_.bg-primary]:bg-[#00FF66]"
              />
            </div>

            {hasCheckedInToday ? (
              <div className="text-center p-3 bg-[rgba(0,255,102,0.1)] rounded-lg border border-[rgba(0,255,102,0.18)]">
                <p className="text-xs text-[#00FF66]">Check-in de hoje registrado. Volte amanhã.</p>
              </div>
            ) : (
              <OlimpoButton
                onClick={() => saveCheckInMutation.mutate(checkInData)}
                className="w-full"
                disabled={saveCheckInMutation.isPending}
              >
                {saveCheckInMutation.isPending ? 'Salvando...' : 'Salvar Check-in (+15 XP)'}
              </OlimpoButton>
            )}
          </div>
        </OlimpoCard>

        {/* Today's Tasks */}
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

          {todayTasks.length === 0 ? (
            <p className="text-sm text-[#9AA0A6] text-center py-4">
              Nenhuma quest por aqui. Crie sua próxima tarefa.
            </p>
          ) : (
            <div className="space-y-2">
              {todayTasks.map(task => (
                <div 
                  key={task.id}
                  className="flex items-center gap-3 p-3 bg-[#070A08] rounded-lg border border-[rgba(0,255,102,0.1)]"
                >
                  <button
                    onClick={() => completeTaskMutation.mutate(task)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      task.completed 
                        ? 'bg-[#00FF66] border-[#00FF66]' 
                        : 'border-[#9AA0A6] hover:border-[#00FF66]'
                    }`}
                  >
                    {task.completed && <Check className="w-3 h-3 text-black" />}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm ${task.completed ? 'text-[#9AA0A6] line-through' : 'text-[#E8E8E8]'}`}>
                      {task.title}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    task.priority === 'high' ? 'bg-[rgba(255,59,59,0.2)] text-[#FF3B3B]' :
                    task.priority === 'medium' ? 'bg-[rgba(255,193,7,0.2)] text-[#FFC107]' :
                    'bg-[rgba(0,255,102,0.2)] text-[#00FF66]'
                  }`}>
                    {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                  </span>
                  <span className="text-xs text-[#00FF66] font-mono">+{task.xpReward || 10}</span>
                </div>
              ))}
            </div>
          )}
        </OlimpoCard>
      </div>

      <XPGainManager />
      <BottomNav />
    </div>
  );
}