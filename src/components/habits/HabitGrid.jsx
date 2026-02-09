import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import OlimpoButton from '../olimpo/OlimpoButton';
import OlimpoProgress from '../olimpo/OlimpoProgress';
import { Check, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { awardXp } from '@/components/xpSystem';

export default function HabitGrid() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentMonth] = useState(new Date());

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: () => base44.entities.Habit.list()
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habitLogs'],
    queryFn: () => base44.entities.HabitLog.list()
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    }
  });

  const toggleHabitDayMutation = useMutation({
    mutationFn: async ({ habit, date }) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const existingLog = habitLogs.find(l => l.habitId === habit.id && l.date === dateStr);
      
      if (existingLog?.completed) {
        toast.error('Conclusão confirmada. Não é possível desfazer.');
        throw new Error('Cannot uncomplete habit');
      }
      
      const xpAmount = habit.xpReward || 8;
      
      if (existingLog) {
        await base44.entities.HabitLog.update(existingLog.id, { completed: true, xpEarned: xpAmount });
      } else {
        await base44.entities.HabitLog.create({
          habitId: habit.id,
          date: dateStr,
          completed: true,
          xpEarned: xpAmount
        });
      }
      
      const sfxEnabled = userProfile?.sfxEnabled ?? true;
      await awardXp({
        amount: xpAmount,
        sourceType: 'habit',
        sourceId: habit.id,
        note: `Hábito: ${habit.name}`,
        sfxEnabled
      });
      
      return xpAmount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['habitLogs']);
      queryClient.invalidateQueries(['xpTransactions']);
    }
  });

  // Generate 4 weeks starting from first day of month
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const weekStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    
    const days = [];
    for (let i = 0; i < 28; i++) {
      days.push(addDays(weekStart, i));
    }
    
    const result = [];
    for (let i = 0; i < 4; i++) {
      result.push(days.slice(i * 7, (i + 1) * 7));
    }
    return result;
  }, [currentMonth]);

  const activeHabits = habits.filter(h => !h.archived);
  const today = new Date();

  // Calculate habit completion % for the grid period
  const getHabitPercent = (habit) => {
    const allDays = weeks.flat();
    let expected = 0;
    let done = 0;

    allDays.forEach(day => {
      const dayOfWeek = format(day, 'EEE', { locale: ptBR }).toLowerCase();
      let shouldDo = false;

      if (habit.frequencyType === 'daily') {
        shouldDo = true;
      } else if (habit.frequencyType === 'weekdays' && habit.weekdays) {
        shouldDo = habit.weekdays.some(w => w.toLowerCase().includes(dayOfWeek.substring(0, 3)));
      }

      if (shouldDo) {
        expected++;
        const dateStr = format(day, 'yyyy-MM-dd');
        const log = habitLogs.find(l => l.habitId === habit.id && l.date === dateStr && l.completed);
        if (log) done++;
      }
    });

    return expected === 0 ? '—' : Math.round((100 * done) / expected);
  };

  // Calculate weekly progress
  const getWeekProgress = (weekIndex) => {
    const weekDays = weeks[weekIndex];
    let expected = 0;
    let done = 0;

    activeHabits.forEach(habit => {
      weekDays.forEach(day => {
        const dayOfWeek = format(day, 'EEE', { locale: ptBR }).toLowerCase();
        let shouldDo = false;

        if (habit.frequencyType === 'daily') {
          shouldDo = true;
        } else if (habit.frequencyType === 'weekdays' && habit.weekdays) {
          shouldDo = habit.weekdays.some(w => w.toLowerCase().includes(dayOfWeek.substring(0, 3)));
        }

        if (shouldDo) {
          expected++;
          const dateStr = format(day, 'yyyy-MM-dd');
          const log = habitLogs.find(l => l.habitId === habit.id && l.date === dateStr && l.completed);
          if (log) done++;
        }
      });
    });

    return expected === 0 ? 0 : Math.round((100 * done) / expected);
  };

  // Check if habit is completed on a specific day
  const isHabitCompletedOnDay = (habit, day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return habitLogs.find(l => l.habitId === habit.id && l.date === dateStr && l.completed);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 
            className="text-2xl font-bold text-[#00FF66] mb-1"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            GRADE DE HÁBITOS
          </h2>
          <p className="text-xs text-[#9AA0A6]">Acompanhe seu progresso diário</p>
        </div>
        <OlimpoButton onClick={() => navigate(createPageUrl('CreateHabit'))}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Hábito
        </OlimpoButton>
      </div>

      {activeHabits.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#9AA0A6] mb-4">Nenhum hábito ativo. Crie seu primeiro hábito!</p>
          <OlimpoButton onClick={() => navigate(createPageUrl('CreateHabit'))}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Hábito
          </OlimpoButton>
        </div>
      ) : (
        <>
          {/* Grid Container */}
          <div className="bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)] rounded-xl overflow-hidden">
            <div className="grid grid-cols-[200px_1fr] divide-x divide-[rgba(0,255,102,0.1)]">
              {/* Left Column: Habits List */}
              <div className="bg-[#070A08]">
                <div className="p-3 border-b border-[rgba(0,255,102,0.18)]">
                  <p 
                    className="text-xs font-bold text-[#00FF66] uppercase"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    Hábito
                  </p>
                </div>
                {activeHabits.map(habit => {
                  const percent = getHabitPercent(habit);
                  return (
                    <div 
                      key={habit.id}
                      className="p-3 border-b border-[rgba(0,255,102,0.05)] flex items-center gap-2"
                      style={{ minHeight: '48px' }}
                    >
                      <div 
                        className="w-1 h-8 bg-[#00FF66] rounded-full"
                        style={{ opacity: 0.6 }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#E8E8E8] truncate">{habit.name}</p>
                        <p 
                          className="text-[10px] text-[#00FF66] font-mono"
                        >
                          {percent === '—' ? '—%' : `${percent}%`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Grid by Weeks */}
              <div className="overflow-x-auto">
                {weeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="border-b border-[rgba(0,255,102,0.1)]">
                    {/* Week Header */}
                    <div className="bg-[#0B0F0C] p-2 border-b border-[rgba(0,255,102,0.18)]">
                      <p 
                        className="text-[10px] font-bold text-[#9AA0A6] uppercase"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                      >
                        Semana {weekIdx + 1}
                      </p>
                    </div>

                    {/* Days Header */}
                    <div className="grid grid-cols-7 border-b border-[rgba(0,255,102,0.1)]">
                      {week.map((day, dayIdx) => {
                        const isToday = isSameDay(day, today);
                        return (
                          <div 
                            key={dayIdx}
                            className={`p-2 text-center border-r border-[rgba(0,255,102,0.05)] ${
                              isToday ? 'bg-[rgba(0,255,102,0.08)]' : ''
                            }`}
                          >
                            <p className={`text-[10px] font-mono ${isToday ? 'text-[#00FF66] font-bold' : 'text-[#9AA0A6]'}`}>
                              {format(day, 'dd/MM')}
                            </p>
                            <p className={`text-[9px] ${isToday ? 'text-[#00FF66]' : 'text-[#9AA0A6]'}`}>
                              {format(day, 'EEE', { locale: ptBR }).toUpperCase()}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Habit Rows */}
                    {activeHabits.map(habit => (
                      <div key={habit.id} className="grid grid-cols-7 border-b border-[rgba(0,255,102,0.05)]">
                        {week.map((day, dayIdx) => {
                          const isCompleted = isHabitCompletedOnDay(habit, day);
                          return (
                            <div 
                              key={dayIdx}
                              className="p-2 flex items-center justify-center border-r border-[rgba(0,255,102,0.05)]"
                              style={{ minHeight: '48px' }}
                            >
                              <button
                                onClick={() => toggleHabitDayMutation.mutate({ habit, date: day })}
                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isCompleted
                                    ? 'bg-[#00FF66] border-[#00FF66]'
                                    : 'border-[#9AA0A6] hover:border-[#00FF66] hover:bg-[rgba(0,255,102,0.05)]'
                                }`}
                              >
                                {isCompleted && <Check className="w-4 h-4 text-black" />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weekly Progress Cards */}
          <div>
            <h3 
              className="text-sm font-bold text-[#00FF66] mb-3 uppercase"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              PROGRESSO SEMANAL
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map(weekIdx => {
                const progress = getWeekProgress(weekIdx);
                return (
                  <div 
                    key={weekIdx}
                    className="bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)] rounded-xl p-4"
                  >
                    <p className="text-xs text-[#9AA0A6] mb-2">Semana {weekIdx + 1}</p>
                    <p 
                      className="text-2xl font-bold text-[#00FF66] mb-2"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {progress}%
                    </p>
                    <OlimpoProgress value={progress} className="h-2" />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}