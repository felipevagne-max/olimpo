import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, subDays, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import OlimpoCard from './OlimpoCard';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function DashboardCharts() {
  const { data: xpTransactions = [] } = useQuery({
    queryKey: ['xpTransactions'],
    queryFn: () => base44.entities.XPTransaction.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list()
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkIns'],
    queryFn: () => base44.entities.CheckIn.list()
  });

  // Generate last 7 days
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return format(date, 'yyyy-MM-dd');
    });
  }, []);

  // XP over time data
  const xpData = useMemo(() => {
    return last7Days.map(date => {
      const dayXP = xpTransactions
        .filter(t => t.created_date?.startsWith(date))
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      return {
        date: format(parseISO(date), 'EEE', { locale: ptBR }),
        xp: dayXP
      };
    });
  }, [xpTransactions, last7Days]);

  // Productivity data (completed tasks per day)
  const productivityData = useMemo(() => {
    return last7Days.map(date => {
      const completedTasks = tasks.filter(t => 
        t.completed && t.completedAt?.startsWith(date)
      ).length;
      
      return {
        date: format(parseISO(date), 'EEE', { locale: ptBR }),
        tasks: completedTasks
      };
    });
  }, [tasks, last7Days]);

  // Check-in data (sleep, productivity, mood)
  const checkInData = useMemo(() => {
    return last7Days.map(date => {
      const checkIn = checkIns.find(c => c.date === date);
      
      return {
        date: format(parseISO(date), 'dd/MM'),
        sono: checkIn?.sleepScore || 0,
        produtividade: checkIn?.productivityScore || 0,
        humor: checkIn?.moodScore || 0
      };
    });
  }, [checkIns, last7Days]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)] px-3 py-2 rounded-lg">
          <p className="text-xs text-[#9AA0A6] mb-1">{label}</p>
          {payload.map((p, i) => (
            <p key={i} className="text-sm font-mono text-[#00FF66]">
              {p.name}: {p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <h2 
        className="text-sm font-semibold text-[#00FF66] mb-3"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        EVOLUÇÃO
      </h2>

      {/* XP over time */}
      <OlimpoCard>
        <h3 className="text-xs text-[#9AA0A6] mb-3">XP ao longo do tempo</h3>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={xpData}>
            <defs>
              <linearGradient id="colorXP" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00FF66" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00FF66" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              stroke="#9AA0A6" 
              style={{ fontSize: '10px' }}
              tickLine={false}
            />
            <YAxis 
              stroke="#9AA0A6" 
              style={{ fontSize: '10px' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="xp" 
              stroke="#00FF66" 
              strokeWidth={2}
              fill="url(#colorXP)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </OlimpoCard>

      {/* Productivity weekly */}
      <OlimpoCard>
        <h3 className="text-xs text-[#9AA0A6] mb-3">Produtividade semanal</h3>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={productivityData}>
            <XAxis 
              dataKey="date" 
              stroke="#9AA0A6" 
              style={{ fontSize: '10px' }}
              tickLine={false}
            />
            <YAxis 
              stroke="#9AA0A6" 
              style={{ fontSize: '10px' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="tasks" 
              fill="#00FF66" 
              opacity={0.8}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </OlimpoCard>

      {/* Check-in metrics */}
      <OlimpoCard>
        <h3 className="text-xs text-[#9AA0A6] mb-3">Check-in (7 dias)</h3>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={checkInData}>
            <XAxis 
              dataKey="date" 
              stroke="#9AA0A6" 
              style={{ fontSize: '10px' }}
              tickLine={false}
            />
            <YAxis 
              domain={[0, 10]}
              stroke="#9AA0A6" 
              style={{ fontSize: '10px' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="sono" 
              stroke="#00FF66" 
              strokeWidth={2}
              dot={{ fill: '#00FF66', r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="produtividade" 
              stroke="#00DD55" 
              strokeWidth={2}
              dot={{ fill: '#00DD55', r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="humor" 
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
      </OlimpoCard>
    </div>
  );
}