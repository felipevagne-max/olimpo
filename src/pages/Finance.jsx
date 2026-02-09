import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BottomNav from '@/components/olimpo/BottomNav';
import TopBar from '@/components/olimpo/TopBar';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import FinanceFAB from '@/components/finance/FinanceFAB';
import QuickExpenseSheet from '@/components/finance/QuickExpenseSheet';
import QuickCardSheet from '@/components/finance/QuickCardSheet';
import QuickIncomeSheet from '@/components/finance/QuickIncomeSheet';
import ReportIncomes from '@/components/finance/ReportIncomes';
import ReportExpenses from '@/components/finance/ReportExpenses';
import ReportCard from '@/components/finance/ReportCard';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, PiggyBank, Clock, AlertTriangle } from 'lucide-react';

export default function Finance() {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeSheet, setActiveSheet] = useState(null);
  const [showExtract, setShowExtract] = useState(false);

  const toggleExpenseStatusMutation = useMutation({
    mutationFn: async (expense) => {
      const newStatus = expense.status === 'programado' ? 'pago' : 'programado';
      const isPaid = newStatus === 'pago';
      
      return base44.entities.Expense.update(expense.id, {
        status: newStatus,
        paid_at: isPaid ? new Date().toISOString() : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
    }
  });

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date')
  });

  // Filter by month
  const monthExpenses = expenses.filter(e => e.date >= monthStart && e.date <= monthEnd);
  
  // RENDA (total income of the month, excluding PERDIDO)
  const renda = monthExpenses
    .filter(e => e.type === 'receita' && e.incomeSubstatus !== 'PERDIDO')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  
  // INVESTIDO (investments of the month - using isInvestment flag)
  const investido = monthExpenses
    .filter(e => e.isInvestment === true)
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  
  // GASTOS (expenses excluding investments)
  const gastos = monthExpenses
    .filter(e => e.type === 'despesa' && !e.isInvestment && e.status === 'pago')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // A PAGAR (programmed expenses)
  const aPagar = monthExpenses
    .filter(e => e.type === 'despesa' && e.status === 'programado')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // NÃO PREVISTO (unplanned expenses that are PAID)
  const naoPrevisto = monthExpenses
    .filter(e => e.type === 'despesa' && e.planType === 'IMPREVISTO' && e.status === 'pago')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // SALDO MÊS
  const saldoMes = renda - (gastos + investido);

  // SEU CAPITAL (all-time, excluding PERDIDO)
  const rendaAcumulada = expenses
    .filter(e => e.type === 'receita' && e.incomeSubstatus !== 'PERDIDO')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const investidoAcumulado = expenses
    .filter(e => e.isInvestment === true)
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const despesasTotal = expenses
    .filter(e => e.type === 'despesa')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const capital = rendaAcumulada + investidoAcumulado - despesasTotal;

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
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 text-[#00FF66] hover:bg-[rgba(0,255,102,0.1)] rounded-lg transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 
            className="text-2xl font-bold text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {format(currentMonth, 'MMMM, yyyy', { locale: ptBR }).toUpperCase()}
          </h1>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 text-[#00FF66] hover:bg-[rgba(0,255,102,0.1)] rounded-lg transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Cards de Resumo (2x2) */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* RENDA */}
          <OlimpoCard className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#00FF66]" />
              <p className="text-xs text-[#9AA0A6] uppercase">Renda</p>
            </div>
            <p 
              className="text-xl font-bold text-[#00FF66]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              R$ {renda.toFixed(2)}
            </p>
          </OlimpoCard>

          {/* GASTOS */}
          <OlimpoCard className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-[#FF3B3B]" />
              <p className="text-xs text-[#9AA0A6] uppercase">Gastos</p>
            </div>
            <p 
              className="text-xl font-bold text-[#FF3B3B]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              R$ {gastos.toFixed(2)}
            </p>
          </OlimpoCard>

          {/* INVESTIDO */}
          <OlimpoCard className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <PiggyBank className="w-4 h-4 text-[#00FF66]" />
              <p className="text-xs text-[#9AA0A6] uppercase">Investido</p>
            </div>
            <p 
              className="text-xl font-bold text-[#00FF66]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              R$ {investido.toFixed(2)}
            </p>
          </OlimpoCard>

          {/* SALDO MÊS */}
          <OlimpoCard className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-[#E8E8E8]" />
              <p className="text-xs text-[#9AA0A6] uppercase">Saldo Mês</p>
            </div>
            <p 
              className="text-xl font-bold"
              style={{ 
                fontFamily: 'JetBrains Mono, monospace',
                color: saldoMes >= 0 ? '#00FF66' : '#FF3B3B'
              }}
            >
              R$ {saldoMes.toFixed(2)}
            </p>
          </OlimpoCard>
        </div>

        {/* SEU CAPITAL */}
        <OlimpoCard className="mb-6 p-5 border-[rgba(0,255,102,0.3)]">
          <div className="text-center">
            <p className="text-sm text-[#9AA0A6] mb-1">Seu Capital</p>
            <p className="text-xs text-[#9AA0A6] mb-3">Panorama geral do seu dinheiro</p>
            <p 
              className="text-3xl font-bold"
              style={{ 
                fontFamily: 'JetBrains Mono, monospace',
                color: capital >= 0 ? '#00FF66' : '#FF3B3B'
              }}
            >
              R$ {capital.toFixed(2)}
            </p>
          </div>
        </OlimpoCard>

        {/* RELATÓRIOS */}
        <div className="mb-6">
          <h2 
            className="text-sm font-bold text-[#00FF66] mb-4 uppercase"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            RELATÓRIOS
          </h2>
          <div className="space-y-3">
            <ReportIncomes currentMonth={currentMonth} />
            <ReportExpenses currentMonth={currentMonth} />
            <ReportCard currentMonth={currentMonth} />
          </div>
        </div>

        {/* Extract Section (when showing) */}
        {showExtract && (
          <OlimpoCard className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#E8E8E8]">Extrato Completo</h3>
              <button
                onClick={() => setShowExtract(false)}
                className="text-xs text-[#00FF66] hover:underline"
              >
                Fechar
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {monthExpenses.map(exp => (
                <div key={exp.id} className="flex items-center gap-3 p-2 bg-[#070A08] rounded-lg">
                  {exp.type === 'despesa' && (
                    <button
                      onClick={() => toggleExpenseStatusMutation.mutate(exp)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        exp.status === 'pago'
                          ? 'bg-[#00FF66] border-[#00FF66]'
                          : 'border-[#9AA0A6] hover:border-[#00FF66]'
                      }`}
                    >
                      {exp.status === 'pago' && (
                        <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#E8E8E8] truncate">{exp.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-[#9AA0A6]">{format(new Date(exp.date), 'dd/MM')}</p>
                      {exp.planType === 'IMPREVISTO' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(255,59,59,0.2)] text-[#FF3B3B]">
                          IMPREVISTO
                        </span>
                      )}
                      {exp.status === 'programado' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(255,193,7,0.2)] text-[#FFC107]">
                          PROGRAMADO
                        </span>
                      )}
                    </div>
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

        {/* Ver Extrato Button */}
        {!showExtract && (
          <OlimpoButton
            variant="secondary"
            className="w-full mb-6"
            onClick={() => setShowExtract(true)}
          >
            Ver Extrato Completo
          </OlimpoButton>
        )}
      </div>

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