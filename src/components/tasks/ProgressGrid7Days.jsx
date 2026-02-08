import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, subDays } from 'date-fns';
import { CheckSquare, Calendar } from 'lucide-react';
import OlimpoCard from '../olimpo/OlimpoCard';

export default function ProgressGrid7Days() {
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list()
  });

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: () => base44.entities.Habit.filter({ archived: false })
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habitLogs'],
    queryFn: () => base44.entities.HabitLog.list()
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkIns'],
    queryFn: () => base44.entities.CheckIn.list()
  });

  // Generate last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return {
      date: format(date, 'yyyy-MM-dd'),
      dayName: format(date, 'EEE').substring(0, 3),
      dayNum: format(date, 'dd'),
      isToday: i === 6
    };
  });

  // Items to track
  const activeHabits = habits.slice(0, 10);
  const recentTasks = tasks
    .filter(t => !t.archived && last7Days.some(d => t.date === d.date))
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
    <OlimpoCard>
      <h3 
        className="text-sm font-semibold text-[#00FF66] mb-1"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        PROGRESSO (7 DIAS)
      </h3>
      <p className="text-xs text-[#9AA0A6] mb-4">Linha do tempo do que foi feito</p>

      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-[rgba(0,255,102,0.18)]">
              <th className="text-left py-2 px-2 text-xs text-[#9AA0A6] w-32">Item</th>
              {last7Days.map((day) => {
                const prodScore = getProductivityScore(day.date);
                return (
                  <th 
                    key={day.date} 
                    className={`text-center py-2 px-1 text-xs ${
                      day.isToday ? 'bg-[rgba(0,255,102,0.1)] border-x-2 border-[rgba(0,255,102,0.3)]' : ''
                    }`}
                  >
                    <div className={day.isToday ? 'text-[#00FF66]' : 'text-[#9AA0A6]'}>
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
                {last7Days.map((day) => {
                  const completed = isItemCompleted(item, day.date);
                  return (
                    <td 
                      key={day.date} 
                      className={`text-center py-2 px-1 ${
                        day.isToday ? 'bg-[rgba(0,255,102,0.05)]' : ''
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 mx-auto ${
                        completed 
                          ? 'bg-[#00FF66] border-[#00FF66]' 
                          : 'border-[rgba(0,255,102,0.18)]'
                      }`} />
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