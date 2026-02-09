import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import FinanceItemStatusPill from './FinanceItemStatusPill';

export default function ReportCard({ currentMonth }) {
  const [isOpen, setIsOpen] = useState(false);

  const monthKey = format(currentMonth, 'yyyy-MM');

  const { data: cards = [] } = useQuery({
    queryKey: ['creditCards'],
    queryFn: () => base44.entities.CreditCard.list()
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['cardPurchases'],
    queryFn: () => base44.entities.CardPurchase.list()
  });

  const { data: installments = [] } = useQuery({
    queryKey: ['cardInstallments'],
    queryFn: () => base44.entities.CardInstallment.list()
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list()
  });

  const activePurchases = purchases.filter(p => !p.deleted_at);
  const activeInstallments = installments.filter(i => !i.deleted_at);

  const monthInstallments = activeInstallments.filter(i => i.monthKey === monthKey);

  // Group by card
  const byCard = monthInstallments.reduce((acc, inst) => {
    const purchase = activePurchases.find(p => p.id === inst.purchaseId);
    if (!purchase) return acc;

    const cardId = purchase.creditCardId;
    if (!acc[cardId]) {
      acc[cardId] = [];
    }
    acc[cardId].push({ ...inst, purchase });
    return acc;
  }, {});

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-[#0B0F0C] border border-[rgba(138,43,226,0.18)] rounded-xl overflow-hidden">
        <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-[rgba(138,43,226,0.05)] transition-colors">
          <h3 
            className="text-sm font-bold text-[#A855F7]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            CARTÃO
          </h3>
          <ChevronDown 
            className={`w-5 h-5 text-[#A855F7] transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4">
            {Object.entries(byCard).map(([cardId, items]) => {
              const card = cards.find(c => c.id === cardId);
              const totalFatura = items.reduce((sum, i) => sum + i.installmentAmount, 0);

              return (
                <div key={cardId} className="border border-[rgba(138,43,226,0.18)] rounded-lg p-3">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-[#E8E8E8]">{card?.name || 'Cartão'}</h4>
                    <p 
                      className="text-sm font-bold text-[#A855F7]"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      R$ {totalFatura.toFixed(2)}
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[#9AA0A6] border-b border-[rgba(138,43,226,0.1)]">
                          <th className="text-left py-1 px-1">Compra</th>
                          <th className="text-right py-1 px-1">Total</th>
                          <th className="text-center py-1 px-1">Parcela</th>
                          <th className="text-right py-1 px-1">Valor</th>
                          <th className="text-left py-1 px-1">Status</th>
                          <th className="text-left py-1 px-1">Cat.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(item => {
                          const category = categories.find(c => c.id === item.purchase.categoryId);
                          return (
                            <tr 
                              key={item.id}
                              className="border-b border-[rgba(138,43,226,0.05)]"
                            >
                              <td className="py-1.5 px-1 text-[#E8E8E8]">{item.purchase.title || 'Compra'}</td>
                              <td 
                                className="py-1.5 px-1 text-right text-[#9AA0A6]"
                                style={{ fontFamily: 'JetBrains Mono, monospace' }}
                              >
                                {item.purchase.totalAmount?.toFixed(2)}
                              </td>
                              <td className="py-1.5 px-1 text-center text-[#9AA0A6]">
                                {item.installmentNumber}/{item.purchase.installmentsTotal}
                              </td>
                              <td 
                                className="py-1.5 px-1 text-right text-[#A855F7] font-bold"
                                style={{ fontFamily: 'JetBrains Mono, monospace' }}
                              >
                                {item.installmentAmount.toFixed(2)}
                              </td>
                              <td className="py-1.5 px-1">
                                <FinanceItemStatusPill 
                                  item={item} 
                                  type="installment"
                                />
                              </td>
                              <td className="py-1.5 px-1 text-[#9AA0A6] text-[10px]">
                                {category?.name || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {Object.keys(byCard).length === 0 && (
              <p className="text-xs text-[#9AA0A6] text-center py-4">
                Nenhuma parcela de cartão neste mês
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}