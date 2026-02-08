import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, addDays, parseISO, differenceInHours } from 'date-fns';
import { Calendar, AlertTriangle, TrendingUp } from 'lucide-react';
import OlimpoCard from '../olimpo/OlimpoCard';

export default function ExpectancyNext7Days() {
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list()
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habitLogs'],
    queryFn: () => base44.entities.HabitLog.list()
  });

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Next 7 days (today + 6)
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i);
    return format(date, 'yyyy-MM-dd');
  });

  // Last 7 days for avg calculation
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, -6 + i);
    return format(date, 'yyyy-MM-dd');
  });

  // Tasks with deadlines in next 7 days
  const upcomingTasks = tasks
    .filter(t => !t.completed && !t.archived)
    .filter(t => {
      const deadline = t.dueDate || t.date;
      if (!deadline) return false;
      return next7Days.includes(deadline);
    })
    .sort((a, b) => {
      const deadlineA = a.dueDate || a.date;
      const deadlineB = b.dueDate || b.date;
      return deadlineA.localeCompare(deadlineB);
    });

  const urgentTasks = upcomingTasks.filter(t => {
    const deadline = t.dueDate || t.date;
    const hoursUntil = differenceInHours(parseISO(deadline + 'T23:59:59'), today);
    return hoursUntil <= 48 || t.priority === 'high';
  });

  // Calculate avg completed per day (last 7 days)
  const completedByDay = last7Days.map(date => {
    const dayTasks = tasks.filter(t => t.date === date && t.completed).length;
    const dayHabits = habitLogs.filter(l => l.date === date && l.completed).length;
    return dayTasks + dayHabits;
  });
  
  const totalCompleted = completedByDay.reduce((sum, count) => sum + count, 0);
  const avgCompleted = completedByDay.length > 0 ? (totalCompleted / completedByDay.length).toFixed(1) : null;

  const risk = avgCompleted 
    ? (urgentTasks.length > avgCompleted * 2 ? 'alto' : urgentTasks.length > avgCompleted ? 'médio' : 'baixo')
    : null;

  const riskColors = {
    alto: 'text-[#FF3B3B]',
    médio: 'text-[#FFC107]',
    baixo: 'text-[#00FFC8]'
  };

  return (
    <OlimpoCard className="border-[rgba(0,255,200,0.2)]">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-[#00FFC8]" />
        <h3 
          className="text-sm font-semibold text-[#00FFC8]"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          EXPECTATIVA (PRÓXIMOS 7 DIAS)
        </h3>
      </div>
      <p className="text-xs text-[#9AA0A6] mb-4">Visão do que vem pela frente</p>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[#070A08] rounded-lg p-2 border border-[rgba(0,255,200,0.1)]">
          <p className="text-xs text-[#9AA0A6]">Deadlines</p>
          <p 
            className="text-lg font-bold text-[#00FFC8]"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {upcomingTasks.length}
          </p>
        </div>
        <div className="bg-[#070A08] rounded-lg p-2 border border-[rgba(0,255,200,0.1)]">
          <p className="text-xs text-[#9AA0A6]">Urgentes</p>
          <p 
            className="text-lg font-bold text-[#FF3B3B]"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {urgentTasks.length}
          </p>
        </div>
        <div className="bg-[#070A08] rounded-lg p-2 border border-[rgba(0,255,200,0.1)]">
          <p className="text-xs text-[#9AA0A6]">Capacidade</p>
          <p 
            className="text-sm font-bold text-[#00FFC8]"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {avgCompleted ? `${avgCompleted}/dia` : '—'}
          </p>
        </div>
      </div>

      {risk && (
        <div className="mb-3 flex items-center gap-2">
          <p className="text-xs text-[#9AA0A6]">Risco:</p>
          <p className={`text-xs font-semibold ${riskColors[risk]}`}>
            {risk.toUpperCase()}
          </p>
        </div>
      )}

      {/* Urgent Tasks */}
      {urgentTasks.length > 0 && (
        <div>
          <p className="text-xs text-[#9AA0A6] mb-2">Urgentes</p>
          <div className="space-y-2">
            {urgentTasks.slice(0, 6).map(task => {
              const deadline = task.dueDate || task.date;
              const hoursUntil = differenceInHours(parseISO(deadline + 'T23:59:59'), today);
              const isVeryUrgent = hoursUntil <= 48;

              return (
                <div 
                  key={task.id}
                  className="flex items-center gap-2 p-2 bg-[#070A08] rounded-lg border"
                  style={{ borderColor: 'rgba(0,255,200,0.2)' }}
                >
                  <Calendar className="w-3 h-3 text-[#00FFC8]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#E8E8E8] truncate">{task.title}</p>
                    <p className="text-[10px] text-[#9AA0A6]">
                      {format(parseISO(deadline), 'dd/MM')}
                    </p>
                  </div>
                  {isVeryUrgent && (
                    <span 
                      className="text-[9px] px-2 py-0.5 rounded font-semibold"
                      style={{ backgroundColor: 'rgba(0,255,200,0.2)', color: '#00FFC8' }}
                    >
                      URGENTE
                    </span>
                  )}
                </div>
              );
            })}
            {urgentTasks.length > 6 && (
              <p className="text-xs text-[#9AA0A6] text-center">+{urgentTasks.length - 6} mais</p>
            )}
          </div>
        </div>
      )}

      {upcomingTasks.length === 0 && (
        <p className="text-xs text-[#9AA0A6] text-center py-2">Nenhum deadline nos próximos 7 dias</p>
      )}
    </OlimpoCard>
  );
}