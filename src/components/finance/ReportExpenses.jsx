import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import FinanceItemStatusPill from './FinanceItemStatusPill';
import EditExpenseSheet from './EditExpenseSheet';

export default function ReportExpenses({ currentMonth }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Expense.filter({ created_by: user.email }, '-date');
    },
    enabled: !!user?.email
  });

  const activeExpenses = useMemo(() => 
    expenses.filter(e => !e.deleted_at),
    [expenses]
  );

  const outs = useMemo(() => 
    activeExpenses
      .filter(e => e.type === 'despesa' && e.date >= monthStart && e.date <= monthEnd && !e.isInvestment)
      .map((exp, idx) => ({ ...exp, num: idx + 1 })),
    [activeExpenses, monthStart, monthEnd]
  );

  // Totals (memoized)
  const totalProgramadoPendente = useMemo(() => 
    outs
      .filter(o => o.planType === 'PREVISTO' && o.status === 'programado')
      .reduce((sum, o) => sum + o.amount, 0),
    [outs]
  );

  const totalPago = useMemo(() => 
    outs
      .filter(o => o.status === 'pago')
      .reduce((sum, o) => sum + o.amount, 0),
    [outs]
  );

  const totalNaoProgPago = useMemo(() => 
    outs
      .filter(o => o.planType === 'IMPREVISTO' && o.status === 'pago')
      .reduce((sum, o) => sum + o.amount, 0),
    [outs]
  );

  const totalNaoProgPendente = useMemo(() => 
    outs
      .filter(o => o.planType === 'IMPREVISTO' && o.status === 'programado')
      .reduce((sum, o) => sum + o.amount, 0),
    [outs]
  );

  return (
    <>
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-[#0B0F0C] border border-[rgba(255,193,7,0.18)] rounded-xl overflow-hidden">
        <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-[rgba(255,193,7,0.05)] transition-colors">
          <h3 
            className="text-sm font-bold text-[#FFC107]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            SAÍDAS / GASTOS
          </h3>
          <ChevronDown 
            className={`w-5 h-5 text-[#FFC107] transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#9AA0A6] border-b border-[rgba(255,193,7,0.1)]">
                  <th className="text-left py-2 px-1">Nº</th>
                  <th className="text-left py-2 px-1">Compra</th>
                  <th className="text-right py-2 px-1">Valor</th>
                  <th className="text-left py-2 px-1">Data</th>
                  <th className="text-left py-2 px-1">Status</th>
                  <th className="text-left py-2 px-1">Tipo</th>
                  <th className="text-left py-2 px-1">Categoria</th>
                </tr>
              </thead>
              <tbody>
                {outs.map(out => {
                  const isProgrammed = out.planType === 'PREVISTO';
                  const lineColor = isProgrammed ? '#3B82F6' : '#F59E0B';
                  return (
                    <tr 
                      key={out.id}
                      className="border-b border-[rgba(255,193,7,0.05)]"
                      style={{ borderLeftColor: lineColor, borderLeftWidth: 3 }}
                    >
                      <td className="py-2 px-1 text-[#9AA0A6]">{out.num}</td>
                      <td className="py-2 px-1 text-[#E8E8E8]">{out.title}</td>
                      <td 
                        className="py-2 px-1 text-right text-[#FF3B3B] font-bold"
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        R$ {out.amount.toFixed(2)}
                      </td>
                      <td className="py-2 px-1 text-[#9AA0A6]">
                        {format(new Date(out.date), 'dd/MM/yy')}
                      </td>
                      <td className="py-2 px-1">
                        <FinanceItemStatusPill 
                          item={out} 
                          type="expense"
                          onEdit={() => setEditingItem(out)}
                        />
                      </td>
                      <td className="py-2 px-1">
                        <span 
                          className="text-[10px] px-2 py-0.5 rounded"
                          style={{ 
                            backgroundColor: isProgrammed ? '#3B82F620' : '#F59E0B20',
                            color: isProgrammed ? '#3B82F6' : '#F59E0B'
                          }}
                        >
                          {isProgrammed ? 'PROGRAMADO' : 'NÃO PROGRAMADO'}
                        </span>
                      </td>
                      <td className="py-2 px-1 text-[#9AA0A6]">{out.category || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Summary */}
            <div className="mt-4 pt-4 border-t border-[rgba(255,193,7,0.18)] space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#9AA0A6]">Total Programado (pendente):</span>
                <span 
                  className="text-[#FFD400] font-bold"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  R$ {totalProgramadoPendente.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9AA0A6]">Total Pago:</span>
                <span 
                  className="text-[#FF3B3B] font-bold"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  R$ {totalPago.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9AA0A6]">Total Não Programado (pago):</span>
                <span 
                  className="text-[#F59E0B] font-bold"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  R$ {totalNaoProgPago.toFixed(2)}
                </span>
              </div>
              {totalNaoProgPendente > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#9AA0A6]">Total Não Programado (pendente):</span>
                  <span 
                    className="text-[#F59E0B] font-bold"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    R$ {totalNaoProgPendente.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>

    <EditExpenseSheet 
      open={!!editingItem} 
      onClose={() => setEditingItem(null)} 
      expense={editingItem}
    />
    </>
  );
}