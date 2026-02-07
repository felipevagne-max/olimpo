import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BottomNav from '@/components/olimpo/BottomNav';
import TopBar from '@/components/olimpo/TopBar';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import { CheckSquare, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

export default function Progress() {
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
      dayName: format(date, 'EEE', { locale: ptBR }),
      dayNum: format(date, 'dd/MM')
    };
  });

  // Check-in data for psychological block
  const checkInData = last7Days.map(day => {
    const checkIn = checkIns.find(c => c.date === day.date);
    return {
      date: day.dayNum,
      sono: checkIn?.sleepScore || 0,
      produtividade: checkIn?.productivityScore || 0,
      humor: checkIn?.moodScore || 0
    };
  });

  const hasCheckInData = checkInData.some(d => d.sono > 0 || d.produtividade > 0 || d.humor > 0);

  // Calculate averages and trend
  const avgSleep = checkInData.reduce((sum, d) => sum + d.sono, 0) / checkInData.filter(d => d.sono > 0).length || 0;
  const avgProductivity = checkInData.reduce((sum, d) => sum + d.produtividade, 0) / checkInData.filter(d => d.produtividade > 0).length || 0;
  const avgMood = checkInData.reduce((sum, d) => sum + d.humor, 0) / checkInData.filter(d => d.humor > 0).length || 0;

  const first3Avg = (checkInData.slice(0, 3).reduce((sum, d) => sum + d.humor, 0) / 3) || 0;
  const last3Avg = (checkInData.slice(4, 7).reduce((sum, d) => sum + d.humor, 0) / 3) || 0;
  
  let trend = 'estável';
  let TrendIcon = Minus;
  if (last3Avg - first3Avg > 1) { trend = 'em alta'; TrendIcon = TrendingUp; }
  if (first3Avg - last3Avg > 1) { trend = 'em queda'; TrendIcon = TrendingDown; }

  // Generate insight
  let insight = 'Você está construindo consistência. Ajuste o ritmo conforme necessário.';
  if (avgMood < 5) insight = 'Seu humor ficou abaixo do ideal. Ajustes pequenos podem ajudar.';
  else if (avgSleep < 5) insight = 'Seu sono foi baixo na semana. Priorize recuperação.';
  else if (avgProductivity >= 7 && avgMood >= 7) insight = 'Boa consistência: você está em ritmo forte.';

  // Activity grid data
  const activeHabits = habits.slice(0, 10);
  const recentTasks = tasks
    .filter(t => !t.archived && last7Days.some(d => t.date === d.date))
    .slice(0, 10);

  const gridItems = [
    ...activeHabits.map(h => ({ id: h.id, name: h.name, type: 'habit', xp: h.xpReward || 8 })),
    ...recentTasks.map(t => ({ id: t.id, name: t.title, type: 'task', xp: t.xpReward || 10 }))
  ];

  const isItemCompleted = (item, date) => {
    if (item.type === 'habit') {
      return habitLogs.some(l => l.habitId === item.id && l.date === date && l.completed);
    } else {
      const task = tasks.find(t => t.id === item.id);
      return task?.completed && task?.completedAt?.startsWith(date);
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)] px-3 py-2 rounded-lg">
          {payload.map((p, i) => (
            <p key={i} className="text-xs font-mono text-[#00FF66]">
              {p.name}: {p.value.toFixed(1)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-black pb-20">
      <TopBar />
      <div className="px-4 pt-20">
        <h1 
          className="text-xl font-bold text-[#00FF66] mb-2"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          PROGRESSO
        </h1>
        <p className="text-sm text-[#9AA0A6] mb-6">
          Sua jornada dos últimos 7 dias
        </p>

        {/* Psychological Block */}
        <OlimpoCard className="mb-6">
          <h3 
            className="text-sm font-semibold text-[#00FF66] mb-1"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            COMO VOCÊ SE SENTIU (7 DIAS)
          </h3>
          <p className="text-xs text-[#9AA0A6] mb-4">
            Um resumo do seu check-in recente
          </p>

          {hasCheckInData ? (
            <>
              {/* Mini chart */}
              <div className="mb-4">
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={checkInData}>
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="sono" 
                      name="Sono"
                      stroke="#00FF66" 
                      strokeWidth={2}
                      dot={{ fill: '#00FF66', r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="produtividade" 
                      name="Produtividade"
                      stroke="#00DD55" 
                      strokeWidth={2}
                      dot={{ fill: '#00DD55', r: 3 }}
                      strokeDasharray="3 3"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="humor" 
                      name="Humor"
                      stroke="#00AA44" 
                      strokeWidth={2}
                      dot={{ fill: '#00AA44', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#00FF66]" />
                    <span className="text-[10px] text-[#9AA0A6]">Sono</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#00DD55]" />
                    <span className="text-[10px] text-[#9AA0A6]">Produtividade</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#00AA44]" />
                    <span className="text-[10px] text-[#9AA0A6]">Humor</span>
                  </div>
                </div>
              </div>

              {/* Averages */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center">
                  <p 
                    className="text-xl font-bold text-[#00FF66]"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {avgSleep.toFixed(1)}
                  </p>
                  <p className="text-xs text-[#9AA0A6]">Média Sono</p>
                </div>
                <div className="text-center">
                  <p 
                    className="text-xl font-bold text-[#00FF66]"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {avgProductivity.toFixed(1)}
                  </p>
                  <p className="text-xs text-[#9AA0A6]">Média Produtividade</p>
                </div>
                <div className="text-center">
                  <p 
                    className="text-xl font-bold text-[#00FF66]"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {avgMood.toFixed(1)}
                  </p>
                  <p className="text-xs text-[#9AA0A6]">Média Humor</p>
                </div>
              </div>

              {/* Trend */}
              <div className="flex items-center justify-center gap-2 mb-3 p-2 bg-[rgba(0,255,102,0.05)] rounded-lg">
                <TrendIcon className="w-4 h-4 text-[#9AA0A6]" />
                <p className="text-xs text-[#9AA0A6]">
                  Tendência: <span className="text-[#00FF66]">{trend}</span>
                </p>
              </div>

              {/* Insight */}
              <p className="text-xs text-[#9AA0A6] text-center italic">
                {insight}
              </p>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-[#9AA0A6] mb-2">
                Registre seu check-in diário para ver seu progresso psicológico.
              </p>
            </div>
          )}
        </OlimpoCard>

        {/* Activity Grid */}
        <OlimpoCard>
          <h3 
            className="text-sm font-semibold text-[#00FF66] mb-4"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            CHECKLIST (7 DIAS)
          </h3>

          {gridItems.length === 0 ? (
            <p className="text-sm text-[#9AA0A6] text-center py-6">
              Sem dados suficientes para os últimos 7 dias.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-[rgba(0,255,102,0.18)]">
                    <th className="text-left py-2 px-2 text-xs text-[#9AA0A6]">Item</th>
                    {last7Days.map((day) => (
                      <th key={day.date} className="text-center py-2 px-1 text-xs text-[#9AA0A6]">
                        <div>{day.dayName}</div>
                        <div className="text-[10px]">{day.dayNum}</div>
                      </th>
                    ))}
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
                          <span className="text-xs text-[#E8E8E8] truncate max-w-[120px]">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      {last7Days.map((day) => {
                        const completed = isItemCompleted(item, day.date);
                        return (
                          <td key={day.date} className="text-center py-2 px-1">
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
          )}
        </OlimpoCard>
      </div>
      <BottomNav />
    </div>
  );
}