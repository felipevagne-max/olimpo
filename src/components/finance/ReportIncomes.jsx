import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth, isBefore } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import FinanceItemStatusPill from './FinanceItemStatusPill';
import EditExpenseSheet from './EditExpenseSheet';

const STATUS_COLORS = {
  RECEBIDO: '#00FF66',
  PROGRAMADO: '#FFD400',
  AGUARDANDO: '#A855F7',
  ADIADO: '#FF3B3B',
  PERDIDO: '#6B7280'
};

export default function ReportIncomes({ currentMonth }) {
  const [isOpen, setIsOpen] = useState(true);
  const [editingItem, setEditingItem] = useState(null);

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date')
  });

  const activeExpenses = expenses.filter(e => !e.deleted_at);

  const incomes = activeExpenses
    .filter(e => e.type === 'receita' && e.date >= monthStart && e.date <= monthEnd)
    .map((inc, idx) => ({ ...inc, num: idx + 1 }));

  const today = format(new Date(), 'yyyy-MM-dd');

  // Totals
  const totalProgramado = incomes
    .filter(i => i.incomeSubstatus === 'PROGRAMADO')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalRecebido = incomes
    .filter(i => i.incomeSubstatus === 'RECEBIDO')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalAReceber = incomes
    .filter(i => (i.incomeSubstatus === 'PROGRAMADO' || i.incomeSubstatus === 'AGUARDANDO'))
    .reduce((sum, i) => sum + i.amount, 0);

  const totalAtrasado = incomes
    .filter(i => (i.incomeSubstatus === 'PROGRAMADO' || i.incomeSubstatus === 'AGUARDANDO') && i.date < today)
    .reduce((sum, i) => sum + i.amount, 0);

  const totalAdiado = incomes
    .filter(i => i.incomeSubstatus === 'ADIADO')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalPerdido = incomes
    .filter(i => i.incomeSubstatus === 'PERDIDO')
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <>
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)] rounded-xl overflow-hidden">
        <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-[rgba(0,255,102,0.05)] transition-colors">
          <h3 
            className="text-sm font-bold text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            ENTRADAS
          </h3>
          <ChevronDown 
            className={`w-5 h-5 text-[#00FF66] transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#9AA0A6] border-b border-[rgba(0,255,102,0.1)]">
                  <th className="text-left py-2 px-1">Nº</th>
                  <th className="text-left py-2 px-1">Origem</th>
                  <th className="text-right py-2 px-1">Valor</th>
                  <th className="text-left py-2 px-1">Pagador</th>
                  <th className="text-left py-2 px-1">Data</th>
                  <th className="text-left py-2 px-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {incomes.map(inc => {
                  const statusColor = STATUS_COLORS[inc.incomeSubstatus] || STATUS_COLORS.PROGRAMADO;
                  return (
                    <tr 
                      key={inc.id}
                      className="border-b border-[rgba(0,255,102,0.05)]"
                      style={{ borderLeftColor: statusColor, borderLeftWidth: 3 }}
                    >
                      <td className="py-2 px-1 text-[#9AA0A6]">{inc.num}</td>
                      <td className="py-2 px-1 text-[#E8E8E8]">{inc.title}</td>
                      <td 
                        className="py-2 px-1 text-right text-[#00FF66] font-bold"
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        R$ {inc.amount.toFixed(2)}
                      </td>
                      <td className="py-2 px-1 text-[#E8E8E8]">{inc.payer || '—'}</td>
                      <td className="py-2 px-1 text-[#9AA0A6]">
                        {format(new Date(inc.date), 'dd/MM/yyyy')}
                      </td>
                      <td className="py-2 px-1">
                        <FinanceItemStatusPill 
                          item={inc} 
                          type="income"
                          onEdit={() => setEditingItem(inc)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Summary */}
            <div className="mt-4 pt-4 border-t border-[rgba(0,255,102,0.18)] space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#9AA0A6]">Total Programado:</span>
                <span 
                  className="text-[#FFD400] font-bold"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  R$ {totalProgramado.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9AA0A6]">Total já recebido:</span>
                <span 
                  className="text-[#00FF66] font-bold"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  R$ {totalRecebido.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9AA0A6]">Total a receber:</span>
                <span 
                  className="text-[#E8E8E8] font-bold"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  R$ {totalAReceber.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9AA0A6]">Total atrasado:</span>
                <span 
                  className="text-[#FF3B3B] font-bold"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  R$ {totalAtrasado.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9AA0A6]">Total Adiado:</span>
                <span 
                  className="text-[#FF3B3B] font-bold"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  R$ {totalAdiado.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9AA0A6]">Total Perdido:</span>
                <span 
                  className="text-[#6B7280] font-bold"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  R$ {totalPerdido.toFixed(2)}
                </span>
              </div>
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