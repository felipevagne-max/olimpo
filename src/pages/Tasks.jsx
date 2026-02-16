import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, subDays, isToday, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BottomNav from '@/components/olimpo/BottomNav';
import TopBar from '@/components/olimpo/TopBar';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import EmptyState from '@/components/olimpo/EmptyState';
import TaskModal from '@/components/tasks/TaskModal';
import QuickTaskSheet from '@/components/tasks/QuickTaskSheet';
import TaskTypeSelector from '@/components/tasks/TaskTypeSelector';
import ProgressGrid7Days from '@/components/tasks/ProgressGrid7Days';
import ExpectancyNext7Days from '@/components/tasks/ExpectancyNext7Days';
import { XPGainManager, triggerXPGain } from '@/components/olimpo/XPGainEffect';
import { Plus, Check, Zap, Trophy, Medal, User, Calendar, AlertTriangle, MoreVertical, Pencil, Archive, Trash2, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
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

export default function Tasks() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [showQuickTask, setShowQuickTask] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showOverdue, setShowOverdue] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Task.filter({ created_by: user.email });
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

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Habit.filter({ archived: false, created_by: user.email });
    },
    enabled: !!user?.email,
    staleTime: 600000
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habitLogs'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.HabitLog.filter({ created_by: user.email });
    },
    enabled: !!user?.email,
    staleTime: 300000
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Expense.filter({ deleted_at: null, created_by: user.email });
    },
    enabled: !!user?.email,
    staleTime: 300000
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
      
      const baseXP = task.xpReward || 10;
      const xpAmount = task.isOverdue ? Math.round(baseXP * 0.5) : baseXP;
      
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
      if (task.goalId && user?.email) {
        const goals = await base44.entities.Goal.filter({ created_by: user.email });
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
      const existingLog = habitLogs.find(l => l.habitId === habit.id && l.date === selectedDateStr);
      if (existingLog?.completed) {
        toast.error('Conclusão confirmada. Não é possível desfazer.');
        throw new Error('Already completed');
      }
      
      const xpAmount = habit.xpReward || 8;
      
      await base44.entities.HabitLog.create({
        habitId: habit.id,
        date: selectedDateStr,
        completed: true,
        xpEarned: xpAmount
      });
      
      const { awardXp } = await import('@/components/xpSystem');
      const sfxEnabled = userProfile?.sfxEnabled ?? true;
      
      await awardXp({
        amount: xpAmount,
        sourceType: 'habit',
        sourceId: habit.id,
        note: `Hábito: ${habit.name}`,
        sfxEnabled
      });
      
      // Progress linked goal if exists (once per day)
      if (habit.goalId && user?.email) {
        const goals = await base44.entities.Goal.filter({ created_by: user.email });
        const linkedGoal = goals.find(g => g.id === habit.goalId);
        if (linkedGoal && linkedGoal.goalType === 'accumulative' && !linkedGoal.deleted_at) {
          const newValue = (linkedGoal.currentValue || 0) + 1;
          await base44.entities.Goal.update(linkedGoal.id, { currentValue: newValue });
        }
      }
      
      return xpAmount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['habitLogs']);
      queryClient.invalidateQueries(['xpTransactions']);
      queryClient.invalidateQueries(['goals']);
    }
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.update(id, { archived: true }),
    onSuccess: () => queryClient.invalidateQueries(['tasks'])
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      setDeleteId(null);
    }
  });

  // Generate week days
  const weekDays = [];
  for (let i = -2; i <= 4; i++) {
    weekDays.push(addDays(new Date(), i));
  }

  // Filter tasks
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const dayTasks = showOverdue
    ? tasks.filter(t => !t.archived && !t.completed && t.dueDate && isBefore(parseISO(t.dueDate), new Date()) && !isToday(parseISO(t.dueDate)))
    : tasks.filter(t => t.date === selectedDateStr && !t.archived && !t.completed);
  
  const completedDayTasks = showOverdue ? [] : tasks.filter(t => {
    if (t.date !== selectedDateStr || t.archived || !t.completed) return false;
    // Only show completed tasks from last 7 days
    if (!t.completedAt) return false;
    const completedDate = new Date(t.completedAt);
    return completedDate >= sevenDaysAgo;
  });

  const completedDayHabits = showOverdue ? [] : habits.filter(habit => {
    const isCompletedToday = habitLogs.some(l => l.habitId === habit.id && l.date === selectedDateStr && l.completed);
    return isCompletedToday;
  });
  
  const dayHabits = showOverdue ? [] : habits.filter(habit => {
    if (habit.frequencyType === 'daily') return true;
    if (habit.frequencyType === 'weekdays') {
      const dayOfWeek = format(selectedDate, 'EEE', { locale: ptBR }).toLowerCase();
      return habit.weekdays?.includes(dayOfWeek);
    }
    // For timesPerWeek, show in all days for now (stable approach)
    return habit.frequencyType === 'timesPerWeek';
  });

  const dayExpenses = showOverdue ? [] : expenses.filter(e => e.date === selectedDateStr);

  const combinedItems = showOverdue ? dayTasks.map(t => ({
    ...t,
    type: 'task',
    isCompleted: t.completed
  })) : [
    ...dayTasks.map(t => ({
      ...t,
      type: 'task',
      sortTime: t.timeOfDay || '99:99',
      sortPriority: t.priority === 'high' ? 1 : t.priority === 'medium' ? 2 : 3,
      sortUrgency: t.dueDate ? (isBefore(parseISO(t.dueDate), new Date()) ? 0 : 1) : 2,
      isCompleted: t.completed
    })),
    ...dayHabits.map(h => ({
      ...h,
      type: 'habit',
      sortTime: h.timeOfDay || h.reminderTime || '99:99',
      sortPriority: 2,
      sortUrgency: 1,
      isCompleted: habitLogs.some(l => l.habitId === h.id && l.date === selectedDateStr && l.completed)
    }))
  ].sort((a, b) => {
    if (a.sortTime !== '99:99' || b.sortTime !== '99:99') {
      if (a.sortTime !== b.sortTime) return a.sortTime.localeCompare(b.sortTime);
    }
    if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
    if (a.sortUrgency !== b.sortUrgency) return a.sortUrgency - b.sortUrgency;
    return new Date(a.created_date || 0) - new Date(b.created_date || 0);
  });

  const completedCount = combinedItems.filter(i => i.isCompleted).length;
  const overdueTasks = tasks.filter(t => !t.archived && !t.completed && t.dueDate && isBefore(parseISO(t.dueDate), new Date()) && !isToday(parseISO(t.dueDate)));

  // Stats from XP
  const todayXP = xpTransactions
    .filter(t => t.created_date?.startsWith(todayStr))
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalXP = xpTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const level = Math.floor(totalXP / 500) + 1;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 relative z-10">
      <TopBar />
      <div className="px-4 pt-20 relative z-10">
        {/* HUD Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5 bg-[#0B0F0C] px-3 py-1.5 rounded-full border border-[rgba(0,255,102,0.18)]">
            <Zap className="w-4 h-4 text-[#00FF66]" />
            <span className="text-xs font-mono text-[#00FF66]">+{todayXP}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#0B0F0C] px-3 py-1.5 rounded-full border border-[rgba(0,255,102,0.18)]">
            <Trophy className="w-4 h-4 text-[#FFC107]" />
            <span className="text-xs font-mono text-[#FFC107]">{completedCount}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#0B0F0C] px-3 py-1.5 rounded-full border border-[rgba(0,255,102,0.18)]">
            <Medal className="w-4 h-4 text-[#9AA0A6]" />
            <span className="text-xs font-mono text-[#9AA0A6]">Lv.{level}</span>
          </div>
        </div>

        {/* Main Card */}
        <OlimpoCard className="mb-6" glow>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-[rgba(0,255,102,0.15)] flex items-center justify-center">
              <Calendar className="w-8 h-8 text-[#00FF66]" />
            </div>
            <div className="flex-1">
              <h1 
                className="text-2xl font-bold text-[#00FF66] mb-1"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                EXECUÇÃO ON
              </h1>
                <p className="text-sm text-[#9AA0A6]">
                <span className="text-[#00FF66] font-mono">{completedCount}/{combinedItems.length}</span> concluídas
                </p>
            </div>
          </div>
          <OlimpoButton 
            className="w-full mt-4"
            onClick={() => setShowTypeSelector(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Tarefa
          </OlimpoButton>
        </OlimpoCard>

        {/* Day Selector */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setShowOverdue(!showOverdue)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
              showOverdue
                ? 'bg-[#FF3B3B] text-white'
                : overdueTasks.length > 0
                  ? 'bg-[rgba(255,59,59,0.2)] text-[#FF3B3B] border border-[rgba(255,59,59,0.3)]'
                  : 'bg-[#0B0F0C] text-[#9AA0A6] border border-[rgba(0,255,102,0.18)]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {overdueTasks.length}
          </button>

          {weekDays.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const isSelected = dayStr === selectedDateStr && !showOverdue;
            
            // Calculate total items for this day (tasks + habits)
            const dayTasksList = tasks.filter(t => t.date === dayStr && !t.archived);
            const dayHabitsList = habits.filter(habit => {
              if (habit.frequencyType === 'daily') return true;
              if (habit.frequencyType === 'weekdays') {
                const dayOfWeek = format(day, 'EEE', { locale: ptBR }).toLowerCase();
                return habit.weekdays?.includes(dayOfWeek);
              }
              return habit.frequencyType === 'timesPerWeek';
            });
            
            const totalItems = dayTasksList.length + dayHabitsList.length;
            const completedTasks = dayTasksList.filter(t => t.completed).length;
            const completedHabits = dayHabitsList.filter(h => 
              habitLogs.some(l => l.habitId === h.id && l.date === dayStr && l.completed)
            ).length;
            const completedItems = completedTasks + completedHabits;

            return (
              <button
                key={dayStr}
                onClick={() => { setSelectedDate(day); setShowOverdue(false); }}
                className={`flex flex-col items-center px-3 py-2 rounded-lg min-w-[50px] transition-all ${
                  isSelected
                    ? 'bg-[#00FF66] text-black'
                    : 'bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)] text-[#9AA0A6] hover:border-[#00FF66]'
                }`}
              >
                <span className="text-[10px] uppercase">
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span className="text-lg font-bold">{format(day, 'd')}</span>
                {totalItems > 0 && (
                  <span className={`text-[9px] ${isSelected ? 'text-black/70' : 'text-[#00FF66]'}`}>
                    {completedItems}/{totalItems}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Combined List */}
        {combinedItems.length === 0 && dayExpenses.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={showOverdue ? "Sem tarefas atrasadas" : "Nenhum novo desafio à vista"}
            description={showOverdue ? "Todas as tarefas estão em dia!" : "Crie sua próxima tarefa."}
            actionLabel="Criar Tarefa"
            onAction={() => setShowTypeSelector(true)}
          />
        ) : (
          <div className="space-y-3">
            {combinedItems.map(item => (
              <OlimpoCard key={`${item.type}-${item.id}`}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => item.type === 'task' 
                      ? completeTaskMutation.mutate(item) 
                      : completeHabitMutation.mutate(item)}
                    className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                      item.isCompleted
                        ? 'bg-[#00FF66] border-[#00FF66]' 
                        : 'border-[#9AA0A6] hover:border-[#00FF66]'
                    }`}
                  >
                    {item.isCompleted && <Check className="w-4 h-4 text-black" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.type === 'habit' && (
                        <CheckSquare className="w-3 h-3 text-[#9AA0A6]" />
                      )}
                      <h3 className={`font-medium text-sm ${item.isCompleted ? 'text-[#9AA0A6] line-through' : 'text-[#E8E8E8]'}`}>
                        {item.type === 'task' ? item.title : item.name}
                      </h3>
                    </div>
                    {item.description && (
                      <p className="text-xs text-[#9AA0A6] mt-1 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {item.type === 'habit' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[rgba(0,255,102,0.15)] text-[#9AA0A6]">
                          Rotina
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
                      {item.type === 'task' && item.dueDate && (() => {
                        const hoursUntil = Math.floor((parseISO(item.dueDate + 'T23:59:59') - new Date()) / (1000 * 60 * 60));
                        const isUrgent = hoursUntil <= 48 || item.priority === 'high';
                        return (
                          <span className={`text-xs font-mono ${isUrgent ? 'text-[#00FFC8] font-semibold' : 'text-[#9AA0A6]'}`}>
                            Prazo: {format(parseISO(item.dueDate), 'dd/MM')}
                            {isUrgent && ' ⚡'}
                          </span>
                        );
                      })()}
                      {item.sortTime !== '99:99' && (
                        <span className="text-xs text-[#9AA0A6]">
                          {item.sortTime}
                        </span>
                      )}
                      <span className="text-xs font-mono text-[#00FF66]">
                        +{item.type === 'task' 
                          ? (item.isOverdue ? Math.round((item.xpReward || 10) * 0.5) : (item.xpReward || 10))
                          : (item.xpReward || 8)
                        } XP
                      </span>
                    </div>
                  </div>

                  {item.type === 'task' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 text-[#9AA0A6] hover:text-[#00FF66]">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
                        <DropdownMenuItem 
                          onClick={() => { setEditTask(item); setShowModal(true); }}
                          className="text-[#E8E8E8] focus:bg-[rgba(0,255,102,0.1)]"
                        >
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => archiveMutation.mutate(item.id)}
                          className="text-[#E8E8E8] focus:bg-[rgba(0,255,102,0.1)]"
                        >
                          <Archive className="w-4 h-4 mr-2" /> Arquivar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteId(item.id)}
                          className="text-[#FF3B3B] focus:bg-[rgba(255,59,59,0.1)]"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </OlimpoCard>
            ))}
          </div>
        )}

        {/* Completed Tasks & Habits Section - Moved here */}
        {!showOverdue && (completedDayTasks.length > 0 || completedDayHabits.length > 0) && (
          <div className="mt-6">
            <h3 
              className="text-sm font-semibold text-[#9AA0A6] mb-3"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              CONCLUÍDAS
            </h3>
            <div className="space-y-3">
              {completedDayTasks.map(task => (
                <OlimpoCard key={`completed-task-${task.id}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center bg-[#00FF66] border-[#00FF66]">
                      <Check className="w-4 h-4 text-black" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-[#9AA0A6] line-through">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-xs text-[#9AA0A6] mt-1 line-clamp-2">{task.description}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 text-[#9AA0A6] hover:text-[#00FF66]">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
                        <DropdownMenuItem 
                          onClick={() => setDeleteId(task.id)}
                          className="text-[#FF3B3B] focus:bg-[rgba(255,59,59,0.1)]"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </OlimpoCard>
              ))}
              {completedDayHabits.map(habit => (
                <OlimpoCard key={`completed-habit-${habit.id}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center bg-[#00FF66] border-[#00FF66]">
                      <Check className="w-4 h-4 text-black" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckSquare className="w-3 h-3 text-[#9AA0A6]" />
                        <h3 className="font-medium text-sm text-[#9AA0A6] line-through">
                          {habit.name}
                        </h3>
                      </div>
                      {habit.description && (
                        <p className="text-xs text-[#9AA0A6] mt-1 line-clamp-2">{habit.description}</p>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded bg-[rgba(0,255,102,0.15)] text-[#9AA0A6] inline-block mt-2">
                        Rotina
                      </span>
                    </div>
                  </div>
                </OlimpoCard>
              ))}
            </div>
          </div>
        )}

        {/* Financial Transactions Section */}
        {!showOverdue && dayExpenses.length > 0 && (
          <div className="mt-6">
            <h3 
              className="text-sm font-semibold text-[#9AA0A6] mb-3"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              PROGRAMAÇÕES FINANCEIRAS
            </h3>
            <div className="space-y-3">
              {dayExpenses.map(expense => (
                <OlimpoCard key={expense.id}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                      expense.status === 'pago' 
                        ? 'bg-[#00FF66] border-[#00FF66]' 
                        : 'border-[#FFC107]'
                    }`}>
                      {expense.status === 'pago' && <Check className="w-4 h-4 text-black" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-sm ${
                        expense.status === 'pago' ? 'text-[#9AA0A6] line-through' : 'text-[#E8E8E8]'
                      }`}>
                        {expense.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          expense.status === 'pago'
                            ? 'bg-[rgba(0,255,102,0.2)] text-[#00FF66]'
                            : 'bg-[rgba(255,193,7,0.2)] text-[#FFC107]'
                        }`}>
                          {expense.type === 'receita' ? 'Receita' : 'Despesa'} • {
                            expense.status === 'pago' ? 'Pago' : 
                            expense.status === 'pendente' ? 'Pendente' : 'Programado'
                          }
                        </span>
                        {expense.paymentMethod && (
                          <span className="text-xs text-[#9AA0A6]">
                            {expense.paymentMethod === 'debito' ? 'Débito' :
                             expense.paymentMethod === 'pix' ? 'PIX' :
                             expense.paymentMethod === 'cartao' ? 'Cartão' :
                             expense.paymentMethod === 'dinheiro' ? 'Dinheiro' :
                             expense.paymentMethod === 'debit_pix' ? 'Déb/PIX' : expense.paymentMethod}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-sm font-mono font-semibold ${
                      expense.type === 'receita' ? 'text-[#00FF66]' : 'text-[#FF3B3B]'
                    }`}>
                      {expense.type === 'receita' ? '+' : '-'}R$ {expense.amount?.toFixed(2)}
                    </span>
                  </div>
                </OlimpoCard>
              ))}
            </div>
          </div>
        )}

        {/* Expectancy Next 7 Days */}
        <div className="mt-6">
          <ExpectancyNext7Days />
        </div>

        {/* Progress Grid */}
        <div className="mt-6">
          <ProgressGrid7Days />
        </div>
      </div>

      <TaskTypeSelector
        open={showTypeSelector}
        onClose={() => setShowTypeSelector(false)}
        onSelectQuick={() => setShowQuickTask(true)}
        onSelectFull={() => { setEditTask(null); setShowModal(true); }}
      />

      <QuickTaskSheet
        open={showQuickTask}
        onClose={() => setShowQuickTask(false)}
        defaultDate={selectedDateStr}
      />

      <TaskModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditTask(null); }}
        task={editTask}
        defaultDate={selectedDateStr}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#E8E8E8]">Excluir tarefa?</AlertDialogTitle>
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

      <XPGainManager />
      <BottomNav />
    </div>
  );
}