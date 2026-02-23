import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, subDays } from 'date-fns';
import BottomNav from '@/components/olimpo/BottomNav';
import TopBar from '@/components/olimpo/TopBar';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import { analyzePatterns } from '@/components/oracle/PatternAnalyzer';
import { Eye, Sparkles, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

export default function Oracle() {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const user = (() => { try { return JSON.parse(localStorage.getItem('olimpo_session') || 'null'); } catch { return null; } })();

  const { data: messages = [] } = useQuery({
    queryKey: ['oracleMessages'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.OracleMessage.filter({ created_by: user.email }, '-created_date');
    },
    enabled: !!user?.email
  });

  const { data: insights = [] } = useQuery({
    queryKey: ['oracleInsights'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.OracleInsight.filter({ created_by: user.email }, '-created_date');
    },
    enabled: !!user?.email
  });

  const { data: config } = useQuery({
    queryKey: ['oracleConfig'],
    queryFn: async () => {
      if (!user?.email) return null;
      const configs = await base44.entities.OracleConfig.filter({ created_by: user.email });
      if (configs.length === 0) {
        return await base44.entities.OracleConfig.create({ tone: 'direct' });
      }
      return configs[0];
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

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Task.filter({ created_by: user.email });
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

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Habit.filter({ archived: false, created_by: user.email });
    },
    enabled: !!user?.email
  });



  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const newInsights = analyzePatterns(checkIns, tasks, habitLogs, habits);
      
      if (newInsights.length === 0) {
        toast.info('Dados insuficientes. Continue registrando.');
        return;
      }

      // Clear old insights
      const oldInsights = await base44.entities.OracleInsight.list();
      await Promise.all(oldInsights.map(i => base44.entities.OracleInsight.delete(i.id)));

      // Save new insights
      const today = format(new Date(), 'yyyy-MM-dd');
      const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      
      await Promise.all(newInsights.map(insight =>
        base44.entities.OracleInsight.create({
          ...insight,
          periodStartDate: weekAgo,
          periodEndDate: today,
          read: false
        })
      ));

      // Update config
      if (config) {
        await base44.entities.OracleConfig.update(config.id, {
          lastAnalysisAt: new Date().toISOString()
        });
      }

      toast.success('Análise atualizada');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['oracleInsights']);
      queryClient.invalidateQueries(['oracleConfig']);
    }
  });

  const markInsightsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = insights.filter(i => !i.read);
      await Promise.all(unread.map(i => 
        base44.entities.OracleInsight.update(i.id, { read: true })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['oracleInsights']);
    }
  });

  useEffect(() => {
    if (insights.some(i => !i.read)) {
      markInsightsReadMutation.mutate();
    }
  }, [insights]);

  const consultOracle = async () => {
    setGenerating(true);
    
    const recentInsights = await queryClient.fetchQuery({
      queryKey: ['oracleInsights'],
      queryFn: () => base44.entities.OracleInsight.list('-created_date', 10)
    });

    if (recentInsights.length === 0 || checkIns.length < 3) {
      const response = "Ainda não há dados suficientes. Registre pelo menos 3 dias de check-in e conclua algumas tarefas/hábitos para análise.";
      
      await base44.entities.OracleMessage.create({
        role: 'oracle',
        content: response
      });
      
      setGenerating(false);
      queryClient.invalidateQueries(['oracleMessages']);
      return;
    }

    const insight = recentInsights[0];
    const response = `${insight.title}\n\n${insight.evidence}\n\nAção: ${insight.recommendation}`;
    
    await base44.entities.OracleMessage.create({
      role: 'oracle',
      content: response
    });
    
    setGenerating(false);
    queryClient.invalidateQueries(['oracleMessages']);
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="w-4 h-4 text-[#FF3B3B]" />;
      case 'medium': return <TrendingUp className="w-4 h-4 text-[#FFC107]" />;
      default: return <TrendingDown className="w-4 h-4 text-[#00FF66]" />;
    }
  };

  return (
    <div className="min-h-screen bg-black pb-32">
      <TopBar />
      <div className="px-4 pt-20 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-6 h-6 text-[#00FF66]" style={{ filter: 'drop-shadow(0 0 8px rgba(0,255,102,0.4))' }} />
              <h1 
                className="text-2xl font-bold text-[#00FF66]"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                ORÁCULO
              </h1>
            </div>
            <p className="text-xs text-[#9AA0A6]">Análise dos seus padrões. Ação, não desculpa.</p>
          </div>
          <OlimpoButton
            variant="ghost"
            className="h-8 px-2"
            onClick={() => generateInsightsMutation.mutate()}
            disabled={generateInsightsMutation.isPending}
          >
            <Sparkles className="w-4 h-4" />
          </OlimpoButton>
        </div>

        {/* Insights rápidos */}
        {insights.length > 0 && (
          <div className="space-y-2 mb-4">
            {insights.slice(0, 3).map((insight) => (
              <OlimpoCard key={insight.id} className="p-3">
                <div className="flex items-start gap-3">
                  {getSeverityIcon(insight.severity)}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#E8E8E8] mb-1">
                      {insight.title}
                    </p>
                    <p 
                      className="text-xs text-[#9AA0A6] mb-2"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {insight.evidence}
                    </p>
                    <p className="text-xs text-[#00FF66]">
                      → {insight.recommendation}
                    </p>
                  </div>
                </div>
              </OlimpoCard>
            ))}
          </div>
        )}

        {/* Consultation Result */}
        {messages.length > 0 && (
          <OlimpoCard className="mb-4">
            <h3 className="text-sm font-semibold text-[#E8E8E8] mb-3">Última Consulta</h3>
            <div className="space-y-3">
              {messages.slice(0, 1).map((msg) => (
                <div key={msg.id} className="bg-[#070A08] rounded-lg p-4 border border-[rgba(0,255,102,0.1)]">
                  <p className="text-sm text-[#E8E8E8] whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                  <p className="text-xs text-[#9AA0A6] mt-3">
                    {format(new Date(msg.created_date), 'dd/MM HH:mm')}
                  </p>
                </div>
              ))}
            </div>
          </OlimpoCard>
        )}

        {/* Consult Button */}
        <OlimpoCard className="mb-20">
          <div className="text-center py-6">
            {!generating ? (
              <>
                <Eye className="w-12 h-12 text-[#00FF66] mx-auto mb-4" style={{ filter: 'drop-shadow(0 0 12px rgba(0,255,102,0.4))' }} />
                <OlimpoButton
                  onClick={consultOracle}
                  className="w-full"
                >
                  Consultar Oráculo
                </OlimpoButton>
              </>
            ) : (
              <div className="py-4">
                <LoadingSpinner size="lg" />
                <p className="text-sm text-[#9AA0A6] mt-4">Analisando seus dados...</p>
              </div>
            )}
          </div>
        </OlimpoCard>
      </div>
      <BottomNav />
    </div>
  );
}