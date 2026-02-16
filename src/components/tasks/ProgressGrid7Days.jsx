import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, subDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckSquare, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import OlimpoCard from '../olimpo/OlimpoCard';

export default function ProgressGrid7Days() {
  const [showFuture, setShowFuture] = useState(false);
  
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Task.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Habit.filter({ archived: false, created_by: user.email });
    },
    enabled: !!user?.email
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habitLogs'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.HabitLog.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkIns'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.CheckIn.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  // Generate 7 days (past or future based on state)
  const get7Days = () => {
    if (showFuture) {
      // Next 7 days (future)
      return Array.from({ length: 7 }, (_, i) => {
        const date = addDays(new Date(), i + 1);
        return {
          date: format(date, 'yyyy-MM-dd'),
          dayName: format(date, 'EEE', { locale: ptBR }).substring(0, 3).replace('.', ''),
          dayNum: format(date, 'dd'),
          isToday: false,
          isFuture: true
        };
      });
    } else {
      // Last 7 days (past)
      return Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return {
          date: format(date, 'yyyy-MM-dd'),
          dayName: format(date, 'EEE', { locale: ptBR }).substring(0, 3).replace('.', ''),
          dayNum: format(date, 'dd'),
          isToday: i === 6,
          isFuture: false
        };
      });
    }
  };

  const days7 = get7Days();

  // Items to track
  const activeHabits = habits.slice(0, 10);
  const recentTasks = tasks
    .filter(t => !t.archived && days7.some(d => t.date === d.date))
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 20);

  const gridItems = [
    ...activeHabits.map(h => ({ id: h.id, name: h.name, type: 'habit' })),
    ...recentTasks.map(t => ({ id: t.id, name: t.title, type: 'task' }))
  ];

  const isItemCompleted = (item, date) => {
    if (item.type === 'habit') {
      return habitLogs.some(l => l.habitId === item.id && l.date === date && l.completed);
    } else {
      const task = tasks.find(t => t.id === item.id);
      return task?.completed && task?.completedAt?.startsWith(date);
    }
  };

  const getProductivityScore = (date) => {
    const checkIn = checkIns.find(c => c.date === date);
    return checkIn?.productivityScore;
  };

  if (gridItems.length === 0) return null;

  return (
    <OlimpoCard className="border-[rgba(191,255,74,0.2)]">
      <div className="flex items-center justify-between mb-1">
        <h3 
          className="text-sm font-semibold"
          style={{ fontFamily: 'Orbitron, sans-serif', color: '#BFFF4A' }}
        >
          PROGRESSO (7 DIAS)
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowFuture(false)}
            disabled={!showFuture}
            className={`p-1 rounded transition-colors ${
              !showFuture 
                ? 'text-[#BFFF4A] bg-[rgba(191,255,74,0.15)]' 
                : 'text-[#9AA0A6] hover:text-[#BFFF4A]'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowFuture(true)}
            disabled={showFuture}
            className={`p-1 rounded transition-colors ${
              showFuture 
                ? 'text-[#BFFF4A] bg-[rgba(191,255,74,0.15)]' 
                : 'text-[#9AA0A6] hover:text-[#BFFF4A]'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-xs text-[#9AA0A6] mb-4">
        {showFuture ? 'Próximos 7 dias' : 'Últimos 7 dias'}
      </p>

      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-[rgba(0,255,102,0.18)]">
              <th className="text-left py-2 px-2 text-xs text-[#9AA0A6] w-32">Item</th>
              {days7.map((day) => {
                const prodScore = getProductivityScore(day.date);
                return (
                  <th 
                    key={day.date} 
                    className={`text-center py-2 px-1 text-xs ${
                      day.isToday ? 'border-x-2' : ''
                    }`}
                    style={day.isToday ? { 
                      backgroundColor: 'rgba(191,255,74,0.1)', 
                      borderColor: 'rgba(191,255,74,0.3)' 
                    } : undefined}
                  >
                    <div style={{ color: day.isToday ? '#BFFF4A' : '#9AA0A6' }}>
                      {day.dayName}
                    </div>
                    <div className="text-[10px] text-[#9AA0A6]">{day.dayNum}</div>
                    <div className="text-[9px] text-[#9AA0A6] mt-0.5">
                      Prod: {prodScore ? `${prodScore}/10` : '—'}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {gridItems.map((item) => (
              <tr key={item.id} className="border-b border-[rgba(0,255,102,0.08)]">
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    {item.type === 'habit' ? (
                      <CheckSquare className="w-3 h-3 text-[#9AA0A6]" />
                    ) : (
                      <Calendar className="w-3 h-3 text-[#9AA0A6]" />
                    )}
                    <span className="text-xs text-[#E8E8E8] truncate max-w-[100px]">
                      {item.name}
                    </span>
                  </div>
                </td>
                {days7.map((day) => {
                  const completed = isItemCompleted(item, day.date);
                  return (
                    <td 
                      key={day.date} 
                      className="text-center py-2 px-1"
                      style={day.isToday ? { backgroundColor: 'rgba(191,255,74,0.05)' } : undefined}
                    >
                      <div 
                        className={`w-5 h-5 rounded border-2 mx-auto ${
                          completed ? 'bg-[#BFFF4A]' : ''
                        }`}
                        style={{ 
                          borderColor: completed ? '#BFFF4A' : 'rgba(191,255,74,0.18)'
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </OlimpoCard>
  );
}