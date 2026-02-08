import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BottomNav from '@/components/olimpo/BottomNav';
import TopBar from '@/components/olimpo/TopBar';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import OlimpoInput from '@/components/olimpo/OlimpoInput';
import OlimpoProgress from '@/components/olimpo/OlimpoProgress';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import FinanceFAB from '@/components/finance/FinanceFAB';
import QuickExpenseSheet from '@/components/finance/QuickExpenseSheet';
import QuickCardSheet from '@/components/finance/QuickCardSheet';
import QuickIncomeSheet from '@/components/finance/QuickIncomeSheet';
import { ChevronLeft, ChevronRight, Wallet, TrendingUp, TrendingDown, CreditCard, AlertCircle, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Finance() {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [goalValue, setGoalValue] = useState('');
  const [activeSheet, setActiveSheet] = useState(null);
  const [showExtract, setShowExtract] = useState(false);

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date')
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: (value) => {
      if (!userProfile?.id) throw new Error('Profile not found');
      return base44.entities.UserProfile.update(userProfile.id, { 
        metaEconomiaMensal: parseFloat(value) 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userProfile']);
      setShowGoalDialog(false);
      toast.success('Meta atualizada!');
    }
  });

  // Filter by month
  const monthExpenses = expenses.filter(e => e.date >= monthStart && e.date <= monthEnd);
  
  // Income and expenses (paid only for "today balance")
  const paidIncome = monthExpenses
    .filter(e => e.type === 'receita' && e.status === 'pago' && e.date <= todayStr)
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const paidExpenses = monthExpenses
    .filter(e => e.type === 'despesa' && e.status === 'pago' && e.date <= todayStr)
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const currentBalance = paidIncome - paidExpenses;

  // Total month (all)
  const totalIncome = monthExpenses
    .filter(e => e.type === 'receita')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const totalExpenses = monthExpenses
    .filter(e => e.type === 'despesa')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // Cards data
  const pendingExpenses = monthExpenses
    .filter(e => e.type === 'despesa' && e.status === 'pendente')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const cardExpenses = monthExpenses
    .filter(e => e.paymentMethod === 'cartao')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const unplannedExpenses = monthExpenses
    .filter(e => e.isUnplanned)
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // Chart data
  const chartData = [
    { name: 'Entradas', value: totalIncome, color: '#00FF66' },
    { name: 'Saídas', value: totalExpenses, color: '#FF3B3B' }
  ];

  // Goal calculation
  const savingsGoal = userProfile?.metaEconomiaMensal || 0;
  const spentPercent = totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(1) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      <TopBar />
      <div className="px-4 pt-20">
        {/* Month Selector */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 text-[#00FF66] hover:bg-[rgba(0,255,102,0.1)] rounded-lg transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 
            className="text-xl font-bold text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}
          </h1>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 text-[#00FF66] hover:bg-[rgba(0,255,102,0.1)] rounded-lg transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance */}
        <OlimpoCard className="mb-6" glow>
          <p className="text-xs text-[#9AA0A6] mb-1">Saldo disponível (hoje)</p>
          <p 
            className="text-3xl font-bold"
            style={{ 
              fontFamily: 'JetBrains Mono, monospace',
              color: currentBalance >= 0 ? '#00FF66' : '#FF3B3B'
            }}
          >
            R$ {currentBalance.toFixed(2)}
          </p>
        </OlimpoCard>

        {/* Chart */}
        <OlimpoCard className="mb-6">
          {totalIncome > 0 || totalExpenses > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#00FF66]" />
                  <span className="text-xs text-[#9AA0A6]">
                    Entradas: R$ {totalIncome.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF3B3B]" />
                  <span className="text-xs text-[#9AA0A6]">
                    Saídas: R$ {totalExpenses.toFixed(2)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 text-[#9AA0A6] mx-auto mb-2" />
              <p className="text-sm text-[#9AA0A6]">Sem movimentações neste mês</p>
            </div>
          )}
        </OlimpoCard>

        {/* Savings Goal */}
        <OlimpoCard className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#E8E8E8]">Meta de Economia</h3>
            <button
              onClick={() => {
                setGoalValue(savingsGoal ? String(savingsGoal) : '');
                setShowGoalDialog(true);
              }}
              className="text-xs text-[#00FF66] hover:underline"
            >
              {savingsGoal ? 'Alterar' : 'Definir'}
            </button>
          </div>
          {savingsGoal > 0 ? (
            <>
              <p className="text-sm text-[#9AA0A6] mb-2">
                Meta: R$ {savingsGoal.toFixed(2)}
              </p>
              <OlimpoProgress value={parseFloat(spentPercent)} max={100} showValue />
              <p className="text-xs text-[#9AA0A6] mt-2">
                Você gastou {spentPercent}% da renda até agora.
              </p>
            </>
          ) : (
            <p className="text-sm text-[#9AA0A6]">
              {totalIncome === 0 
                ? 'Sem entradas registradas para calcular a meta.' 
                : 'Defina sua meta de economia mensal.'}
            </p>
          )}
        </OlimpoCard>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => setShowExtract('pending')}
            className="bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)] rounded-xl p-3 hover:border-[#00FF66] transition-all"
          >
            <AlertCircle className="w-5 h-5 text-[#FFC107] mb-2" />
            <p className="text-xs text-[#9AA0A6] mb-1">A pagar</p>
            <p className="text-sm font-bold text-[#E8E8E8]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              R$ {pendingExpenses.toFixed(0)}
            </p>
          </button>

          <button
            onClick={() => setShowExtract('cards')}
            className="bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)] rounded-xl p-3 hover:border-[#00FF66] transition-all"
          >
            <CreditCard className="w-5 h-5 text-[#FFC107] mb-2" />
            <p className="text-xs text-[#9AA0A6] mb-1">Cartões</p>
            <p className="text-sm font-bold text-[#E8E8E8]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              R$ {cardExpenses.toFixed(0)}
            </p>
          </button>

          <button
            onClick={() => setShowExtract('unplanned')}
            className="bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)] rounded-xl p-3 hover:border-[#00FF66] transition-all"
          >
            <TrendingDown className="w-5 h-5 text-[#FF3B3B] mb-2" />
            <p className="text-xs text-[#9AA0A6] mb-1">Não previsto</p>
            <p className="text-sm font-bold text-[#E8E8E8]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              R$ {unplannedExpenses.toFixed(0)}
            </p>
          </button>
        </div>

        {/* Extract Button */}
        <OlimpoButton
          variant="secondary"
          className="w-full mb-6"
          onClick={() => setShowExtract('all')}
        >
          <FileText className="w-4 h-4 mr-2" />
          Ver todas as movimentações
        </OlimpoButton>

        {/* Extract Section (when showing) */}
        {showExtract && (
          <OlimpoCard className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#E8E8E8]">
                {showExtract === 'pending' ? 'A Pagar' :
                 showExtract === 'cards' ? 'Cartões' :
                 showExtract === 'unplanned' ? 'Não Previsto' :
                 'Extrato Completo'}
              </h3>
              <button
                onClick={() => setShowExtract(false)}
                className="text-xs text-[#00FF66] hover:underline"
              >
                Fechar
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {monthExpenses
                .filter(e => {
                  if (showExtract === 'pending') return e.status === 'pendente';
                  if (showExtract === 'cards') return e.paymentMethod === 'cartao';
                  if (showExtract === 'unplanned') return e.isUnplanned;
                  return true;
                })
                .map(exp => (
                  <div key={exp.id} className="flex items-center justify-between p-2 bg-[#070A08] rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#E8E8E8] truncate">{exp.title}</p>
                      <p className="text-xs text-[#9AA0A6]">{format(new Date(exp.date), 'dd/MM')}</p>
                    </div>
                    <p 
                      className="text-sm font-bold"
                      style={{ 
                        fontFamily: 'JetBrains Mono, monospace',
                        color: exp.type === 'receita' ? '#00FF66' : '#FF3B3B'
                      }}
                    >
                      {exp.type === 'receita' ? '+' : '-'}R$ {exp.amount?.toFixed(2)}
                    </p>
                  </div>
                ))}
            </div>
          </OlimpoCard>
        )}
      </div>

      {/* Goal Dialog */}
      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
          <DialogHeader>
            <DialogTitle className="text-[#00FF66]">Definir Meta de Economia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-[#9AA0A6] text-xs">Valor mensal (R$)</Label>
              <OlimpoInput
                type="number"
                step="0.01"
                min="0"
                value={goalValue}
                onChange={(e) => setGoalValue(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <OlimpoButton
              className="w-full"
              onClick={() => updateGoalMutation.mutate(goalValue)}
              disabled={!goalValue || updateGoalMutation.isPending}
            >
              {updateGoalMutation.isPending ? 'Salvando...' : 'Salvar Meta'}
            </OlimpoButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* FAB */}
      <FinanceFAB onAction={setActiveSheet} />

      {/* Quick Sheets */}
      <QuickExpenseSheet open={activeSheet === 'despesa'} onClose={() => setActiveSheet(null)} />
      <QuickCardSheet open={activeSheet === 'cartao'} onClose={() => setActiveSheet(null)} />
      <QuickIncomeSheet open={activeSheet === 'receita'} onClose={() => setActiveSheet(null)} />

      <BottomNav />
    </div>
  );
}