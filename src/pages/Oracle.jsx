import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, subDays } from 'date-fns';
import BottomNav from '@/components/olimpo/BottomNav';
import TopBar from '@/components/olimpo/TopBar';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import OlimpoInput from '@/components/olimpo/OlimpoInput';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import { analyzePatterns, generateOracleResponse } from '@/components/oracle/PatternAnalyzer';
import { Eye, Send, Sparkles, Settings, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

export default function Oracle() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['oracleMessages'],
    queryFn: () => base44.entities.OracleMessage.list('-created_date')
  });

  const { data: insights = [] } = useQuery({
    queryKey: ['oracleInsights'],
    queryFn: () => base44.entities.OracleInsight.list('-created_date')
  });

  const { data: config } = useQuery({
    queryKey: ['oracleConfig'],
    queryFn: async () => {
      const configs = await base44.entities.OracleConfig.list();
      if (configs.length === 0) {
        return await base44.entities.OracleConfig.create({ tone: 'direct' });
      }
      return configs[0];
    }
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkIns'],
    queryFn: () => base44.entities.CheckIn.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list()
  });

  const { data: habitLogs = [] } = useQuery({
    queryKey: ['habitLogs'],
    queryFn: () => base44.entities.HabitLog.list()
  });

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: () => base44.entities.Habit.filter({ archived: false })
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      // Save user message
      await base44.entities.OracleMessage.create({
        role: 'user',
        content
      });

      // Generate response
      setGenerating(true);
      const recentInsights = await queryClient.fetchQuery({
        queryKey: ['oracleInsights'],
        queryFn: () => base44.entities.OracleInsight.list('-created_date', 10)
      });

      const response = generateOracleResponse(
        content,
        recentInsights,
        checkIns,
        tasks,
        config?.tone || 'direct'
      );

      // Save oracle response
      await base44.entities.OracleMessage.create({
        role: 'oracle',
        content: response
      });

      setGenerating(false);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['oracleMessages']);
      setMessage('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
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

  const quickActions = [
    'O que estou fazendo errado?',
    'Me dê um plano para amanhã',
    'Analise minha semana',
    'Como melhorar meu sono?'
  ];

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

        {/* Chat */}
        <OlimpoCard className="p-4 mb-20">
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Eye className="w-12 h-12 text-[#00FF66] mx-auto mb-3 opacity-50" />
                <p className="text-sm text-[#9AA0A6]">
                  Faça uma pergunta ao Oráculo
                </p>
              </div>
            )}
            
            {messages.slice().reverse().map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-[rgba(0,255,102,0.1)] border border-[rgba(0,255,102,0.18)]'
                      : 'bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)]'
                  }`}
                >
                  <p className="text-sm text-[#E8E8E8] whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
            
            {generating && (
              <div className="flex justify-start">
                <div className="bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)] rounded-lg p-3">
                  <LoadingSpinner size="sm" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 mb-3">
            {quickActions.map((action) => (
              <button
                key={action}
                onClick={() => sendMessageMutation.mutate(action)}
                className="text-xs px-3 py-1.5 rounded-full border border-[rgba(0,255,102,0.18)] text-[#00FF66] hover:bg-[rgba(0,255,102,0.1)] transition-all"
              >
                {action}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <OlimpoInput
              placeholder="Pergunte ao Oráculo..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && message.trim()) {
                  sendMessageMutation.mutate(message);
                }
              }}
              className="flex-1"
            />
            <OlimpoButton
              onClick={() => message.trim() && sendMessageMutation.mutate(message)}
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="px-4"
            >
              <Send className="w-4 h-4" />
            </OlimpoButton>
          </div>
        </OlimpoCard>
      </div>
      <BottomNav />
    </div>
  );
}