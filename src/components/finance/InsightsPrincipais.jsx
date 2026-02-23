import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import OlimpoCard from '../olimpo/OlimpoCard';
import { TrendingDown } from 'lucide-react';

export default function InsightsPrincipais({ currentMonth }) {
  const user = (() => { try { return JSON.parse(localStorage.getItem('olimpo_session') || 'null'); } catch { return null; } })();
  const monthKey = format(currentMonth, 'yyyy-MM');
  const monthStart = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), 'yyyy-MM-dd');
  const monthEnd = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0), 'yyyy-MM-dd');

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Expense.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  const { data: installments = [] } = useQuery({
    queryKey: ['cardInstallments'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.CardInstallment.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  const activeExpenses = expenses.filter(e => !e.deleted_at);
  const activeInstallments = installments.filter(i => !i.deleted_at);

  const { data: purchases = [] } = useQuery({
    queryKey: ['cardPurchases'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.CardPurchase.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Category.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  // A) Normal expenses (exclude card bill payments, investment records, and investment transfers)
  const normalExpenses = activeExpenses.filter(e => 
    e.type === 'despesa' &&
    e.date >= monthStart &&
    e.date <= monthEnd &&
    !e.isCardBillPayment &&
    !e.isInvestment &&
    !e.isInvestmentTransfer &&
    e.status === 'pago'
  );

  // B) Card installments for the month
  const monthInstallments = activeInstallments.filter(i => i.monthKey === monthKey);

  // Build category totals
  const categoryTotals = {};

  // Add normal expenses
  normalExpenses.forEach(exp => {
    const catId = exp.categoryId || 'sem_categoria';
    if (!categoryTotals[catId]) {
      categoryTotals[catId] = 0;
    }
    categoryTotals[catId] += exp.amount || 0;
  });

  // Add card installments
  monthInstallments.forEach(inst => {
    const purchase = purchases.find(p => p.id === inst.purchaseId);
    if (purchase) {
      const catId = purchase.categoryId || 'sem_categoria';
      if (!categoryTotals[catId]) {
        categoryTotals[catId] = 0;
      }
      categoryTotals[catId] += inst.installmentAmount || 0;
    }
  });

  // Convert to array and sort
  const sortedCategories = Object.entries(categoryTotals)
    .map(([catId, total]) => {
      const category = categories.find(c => c.id === catId);
      return {
        id: catId,
        name: catId === 'sem_categoria' ? 'Sem categoria' : (category?.name || 'Sem categoria'),
        total
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const totalGastos = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

  if (sortedCategories.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 
        className="text-sm font-bold text-[#00FF66] mb-1 uppercase"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        INSIGHTS PRINCIPAIS
      </h2>
      <p className="text-xs text-[#9AA0A6] mb-4">Resumo do seu mês por categorias.</p>

      <OlimpoCard className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-4 h-4 text-[#FF3B3B]" />
          <h3 className="text-sm font-semibold text-[#E8E8E8]">Onde mais gastou</h3>
        </div>

        <div className="space-y-2">
          {sortedCategories.map((cat, idx) => {
            const percentage = totalGastos > 0 ? (cat.total / totalGastos * 100).toFixed(1) : 0;
            return (
              <div 
                key={cat.id}
                className="flex items-center gap-3 p-2 bg-[#070A08] rounded-lg hover:bg-[rgba(255,59,59,0.05)] transition-colors"
              >
                <span 
                  className="text-xs font-bold text-[#9AA0A6] w-5"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm text-[#E8E8E8]">{cat.name}</span>
                <span 
                  className="text-sm font-bold text-[#FF3B3B]"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  R$ {cat.total.toFixed(2)}
                </span>
                <span 
                  className="text-xs text-[#9AA0A6] w-12 text-right"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </OlimpoCard>
    </div>
  );
}