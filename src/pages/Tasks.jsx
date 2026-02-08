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
import ProgressGrid7Days from '@/components/tasks/ProgressGrid7Days';
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
  const [editTask, setEditTask] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showOverdue, setShowOverdue] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list()
  });

  const { data: xpTransactions = [] } = useQuery({
    queryKey: ['xpTransactions'],
    queryFn: () => base44.entities.XPTransaction.list()
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    }
  });

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: () => base44.entities.Habit.filter({ archived: false })
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habitLogs'],
    queryFn: () => base44.entities.HabitLog.list()
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
      const sfxEnabled = userProfile?.sfxEnabled ?? true;
      triggerXPGain(xpGained, sfxEnabled);
    }
  });

  const completeHabitMutation = useMutation({
    mutationFn: async (habit) => {
      const existingLog = habitLogs.find(l => l.habitId === habit.id && l.date === selectedDateStr);
      if (existingLog?.completed) {
        toast.error('Conclusão confirmada. Não é possível desfazer.');
        throw new Error('Already completed');
      }
      
      await base44.entities.HabitLog.create({
        habitId: habit.id,
        date: selectedDateStr,
        completed: true,
        xpEarned: habit.xpReward || 8
      });
      
      await base44.entities.XPTransaction.create({
        sourceType: 'habit',
        sourceId: habit.id,
        amount: habit.xpReward || 8,
        note: `Hábito: ${habit.name}`
      });
      
      return habit.xpReward || 8;
    },
    onSuccess: (xpGained) => {
      queryClient.invalidateQueries(['habitLogs']);
      queryClient.invalidateQueries(['xpTransactions']);
      const sfxEnabled = userProfile?.sfxEnabled ?? true;
      triggerXPGain(xpGained, sfxEnabled);
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

  // Filter and combine tasks + habits
  const dayTasks = showOverdue
    ? tasks.filter(t => !t.archived && !t.completed && t.dueDate && isBefore(parseISO(t.dueDate), new Date()) && !isToday(parseISO(t.dueDate)))
    : tasks.filter(t => t.date === selectedDateStr && !t.archived);
  
  const dayHabits = showOverdue ? [] : habits.filter(habit => {
    if (habit.frequencyType === 'daily') return true;
    if (habit.frequencyType === 'weekdays') {
      const dayOfWeek = format(selectedDate, 'EEE', { locale: ptBR }).toLowerCase();
      return habit.weekdays?.includes(dayOfWeek);
    }
    // For timesPerWeek, show in all days for now (stable approach)
    return habit.frequencyType === 'timesPerWeek';
  });

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
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
          <div className="w-8 h-8 rounded-full bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)] flex items-center justify-center">
            <User className="w-4 h-4 text-[#9AA0A6]" />
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
                Sequência do Dia
                </h1>
                <p className="text-sm text-[#9AA0A6]">
                <span className="text-[#00FF66] font-mono">{completedCount}/{combinedItems.length}</span> concluídas
                </p>
            </div>
          </div>
          <OlimpoButton 
            className="w-full mt-4"
            onClick={() => { setEditTask(null); setShowModal(true); }}
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
        {combinedItems.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={showOverdue ? "Sem tarefas atrasadas" : "Nenhum novo desafio à vista"}
            description={showOverdue ? "Todas as tarefas estão em dia!" : "Crie sua próxima tarefa."}
            actionLabel="Criar Tarefa"
            onAction={() => { setEditTask(null); setShowModal(true); }}
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
                      {item.type === 'task' && item.priority && (
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          item.priority === 'high' ? 'bg-[rgba(255,59,59,0.2)] text-[#FF3B3B]' :
                          item.priority === 'medium' ? 'bg-[rgba(255,193,7,0.2)] text-[#FFC107]' :
                          'bg-[rgba(0,255,102,0.2)] text-[#00FF66]'
                        }`}>
                          {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Média' : 'Baixa'}
                        </span>
                      )}
                      {item.type === 'task' && item.dueDate && (
                        <span className="text-xs text-[#9AA0A6]">
                          Prazo: {format(parseISO(item.dueDate), 'dd/MM')}
                        </span>
                      )}
                      {item.sortTime !== '99:99' && (
                        <span className="text-xs text-[#9AA0A6]">
                          {item.sortTime}
                        </span>
                      )}
                      <span className="text-xs font-mono text-[#00FF66]">
                        +{item.type === 'task' ? (item.xpReward || 10) : (item.xpReward || 8)} XP
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

        {/* Progress Grid */}
        <div className="mt-6">
          <ProgressGrid7Days />
        </div>
      </div>

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