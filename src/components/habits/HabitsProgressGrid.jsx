import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckSquare } from 'lucide-react';
import OlimpoCard from '../olimpo/OlimpoCard';
import { toast } from 'sonner';
import { triggerXPGain } from '@/components/olimpo/XPGainEffect';

export default function HabitsProgressGrid() {
  const queryClient = useQueryClient();
  
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
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

  // Generate last 7 days
  const get7Days = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, 'yyyy-MM-dd'),
        dayName: format(date, 'EEE', { locale: ptBR }).substring(0, 3).replace('.', ''),
        dayNum: format(date, 'dd'),
        isToday: i === 6
      };
    });
  };

  const days7 = get7Days();

  const isItemCompleted = (habitId, date) => {
    return habitLogs.some(l => l.habitId === habitId && l.date === date && l.completed);
  };

  const handleToggle = async (habitId, date, isCompleted) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    if (isCompleted) {
      // Unmark - apply penalty
      const habitLog = habitLogs.find(l => l.habitId === habitId && l.date === date);
      if (habitLog) {
        await base44.entities.HabitLog.delete(habitLog.id);
        const penaltyXP = -(habit.xpReward || 8) * 2;
        await base44.entities.XPTransaction.create({
          sourceType: 'habit',
          sourceId: habitId,
          amount: penaltyXP,
          note: `Penalidade: ${habit.name} desmarcado`
        });
        toast.error(`-${(habit.xpReward || 8) * 2} XP`, { style: { background: '#FF3B3B' } });
        triggerXPGain(penaltyXP);
      }
    } else {
      // Mark as complete
      await base44.entities.HabitLog.create({
        habitId,
        date,
        completed: true,
        xpEarned: habit.xpReward || 8
      });
      triggerXPGain(habit.xpReward || 8);
    }

    queryClient.invalidateQueries(['habitLogs']);
    queryClient.invalidateQueries(['xpTransactions']);
  };

  if (habits.length === 0) return null;

  return (
    <OlimpoCard className="border-[rgba(191,255,74,0.2)]">
      <h3 
        className="text-sm font-semibold mb-4"
        style={{ fontFamily: 'Orbitron, sans-serif', color: '#BFFF4A' }}
      >
        PROGRESSO HÁBITOS (7 DIAS)
      </h3>

      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-[rgba(0,255,102,0.18)]">
              <th className="text-left py-2 px-2 text-xs text-[#9AA0A6] w-32">Hábito</th>
              {days7.map((day) => (
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
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {habits.map((habit) => (
              <tr key={habit.id} className="border-b border-[rgba(0,255,102,0.08)]">
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-3 h-3 text-[#9AA0A6]" />
                    <span className="text-xs text-[#E8E8E8] truncate max-w-[100px]">
                      {habit.name}
                    </span>
                  </div>
                </td>
                {days7.map((day) => {
                  const completed = isItemCompleted(habit.id, day.date);
                  return (
                    <td 
                      key={day.date} 
                      className="text-center py-2 px-1"
                      style={day.isToday ? { backgroundColor: 'rgba(191,255,74,0.05)' } : undefined}
                    >
                      <button
                        onClick={() => handleToggle(habit.id, day.date, completed)}
                        className={`w-5 h-5 rounded border-2 mx-auto transition-all cursor-pointer hover:opacity-80`}
                        style={{ 
                          backgroundColor: completed ? '#BFFF4A' : 'transparent',
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