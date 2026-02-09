import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, addMonths } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import OlimpoInput from '../olimpo/OlimpoInput';
import OlimpoButton from '../olimpo/OlimpoButton';
import { toast } from 'sonner';

export default function CardPurchaseConfirmDialog({ open, onClose, purchaseId }) {
  const queryClient = useQueryClient();
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [skipFutureConfirms, setSkipFutureConfirms] = useState(false);

  const { data: purchase } = useQuery({
    queryKey: ['cardPurchase', purchaseId],
    queryFn: () => base44.entities.CardPurchase.list().then(p => p.find(x => x.id === purchaseId)),
    enabled: !!purchaseId
  });

  const { data: installments = [] } = useQuery({
    queryKey: ['cardInstallments', purchaseId],
    queryFn: () => base44.entities.CardInstallment.list().then(i => i.filter(x => x.purchaseId === purchaseId)),
    enabled: !!purchaseId
  });

  const { data: card } = useQuery({
    queryKey: ['creditCard', purchase?.creditCardId],
    queryFn: () => base44.entities.CreditCard.list().then(c => c.find(x => x.id === purchase.creditCardId)),
    enabled: !!purchase?.creditCardId
  });

  const { data: category } = useQuery({
    queryKey: ['category', purchase?.categoryId],
    queryFn: () => base44.entities.Category.list().then(c => c.find(x => x.id === purchase.categoryId)),
    enabled: !!purchase?.categoryId
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    }
  });

  useEffect(() => {
    if (installments.length > 0) {
      setInstallmentAmount(installments[0].installmentAmount.toFixed(2));
    }
  }, [installments]);

  const updateInstallmentsMutation = useMutation({
    mutationFn: async (newAmount) => {
      const amount = parseFloat(newAmount);
      const count = installments.length;
      
      // All installments get the new amount, except last one gets adjusted
      const baseAmount = amount;
      const totalFromBase = baseAmount * (count - 1);
      const lastAmount = purchase.totalAmount - totalFromBase;

      const promises = installments.map((inst, idx) => {
        const finalAmount = idx === count - 1 ? lastAmount : baseAmount;
        return base44.entities.CardInstallment.update(inst.id, {
          installmentAmount: finalAmount
        });
      });

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cardInstallments']);
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: (skip) => {
      if (!userProfile?.id) return;
      return base44.entities.UserProfile.update(userProfile.id, {
        skipCardPurchaseConfirm: skip
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userProfile']);
    }
  });

  const handleConfirm = async () => {
    if (installmentAmount !== installments[0]?.installmentAmount.toFixed(2)) {
      await updateInstallmentsMutation.mutateAsync(installmentAmount);
      toast.success('Valores atualizados!');
    }
    
    if (skipFutureConfirms && userProfile?.id) {
      await updateProfileMutation.mutateAsync(true);
    }
    
    onClose();
  };

  if (!purchase || !installments.length) return null;

  const sortedInstallments = [...installments].sort((a, b) => a.installmentNumber - b.installmentNumber);
  const preview = sortedInstallments.slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0B0F0C] border-[rgba(255,193,7,0.3)] max-w-md">
        <DialogHeader>
          <DialogTitle 
            className="text-[#FFC107] text-lg"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Resumo da compra
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[#9AA0A6]">Valor total:</p>
              <p className="text-[#E8E8E8] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                R$ {purchase.totalAmount?.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[#9AA0A6]">Parcelas:</p>
              <p className="text-[#E8E8E8] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {purchase.installmentsTotal}x
              </p>
            </div>
            <div>
              <p className="text-[#9AA0A6]">Primeiro pagamento:</p>
              <p className="text-[#E8E8E8] font-bold">
                {format(new Date(purchase.firstPaymentDate), 'dd/MM/yyyy')}
              </p>
            </div>
            <div>
              <p className="text-[#9AA0A6]">Cartão:</p>
              <p className="text-[#E8E8E8] font-bold">{card?.name || '—'}</p>
            </div>
            <div>
              <p className="text-[#9AA0A6]">Categoria:</p>
              <p className="text-[#E8E8E8] font-bold">{category?.name || '—'}</p>
            </div>
            <div>
              <p className="text-[#9AA0A6]">Compra registrada em:</p>
              <p className="text-[#E8E8E8] font-bold">
                {format(new Date(purchase.purchaseDate), 'dd/MM/yyyy')}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-[rgba(255,193,7,0.2)]">
            <Label className="text-[#9AA0A6] text-xs">Valor da parcela (editável)</Label>
            <OlimpoInput
              type="number"
              step="0.01"
              min="0.01"
              value={installmentAmount}
              onChange={(e) => setInstallmentAmount(e.target.value)}
              className="mt-1"
            />
            <p className="text-[9px] text-[#9AA0A6] mt-1">
              Última parcela será ajustada para fechar o total
            </p>
          </div>

          <div className="pt-2 border-t border-[rgba(255,193,7,0.2)]">
            <p className="text-xs text-[#9AA0A6] mb-2">Próximas parcelas:</p>
            <div className="space-y-1">
              {preview.map(inst => (
                <div key={inst.id} className="flex justify-between text-xs">
                  <span className="text-[#E8E8E8]">
                    {format(new Date(inst.dueDate), 'MMM/yyyy').toUpperCase()}
                  </span>
                  <span 
                    className="text-[#FFC107] font-bold"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    R$ {
                      inst.installmentNumber === sortedInstallments.length
                        ? (purchase.totalAmount - (parseFloat(installmentAmount) * (sortedInstallments.length - 1))).toFixed(2)
                        : parseFloat(installmentAmount).toFixed(2)
                    }
                  </span>
                </div>
              ))}
              {sortedInstallments.length > 3 && (
                <p className="text-[9px] text-[#9AA0A6] text-center pt-1">
                  +{sortedInstallments.length - 3} parcelas...
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 pt-2">
            <Checkbox
              id="skip-confirm"
              checked={skipFutureConfirms}
              onCheckedChange={setSkipFutureConfirms}
              className="mt-0.5"
            />
            <label htmlFor="skip-confirm" className="text-xs text-[#E8E8E8] cursor-pointer">
              Não desejo receber confirmação de valores
            </label>
          </div>
        </div>

        <DialogFooter>
          <OlimpoButton
            variant="secondary"
            onClick={onClose}
          >
            Voltar e ajustar
          </OlimpoButton>
          <OlimpoButton
            onClick={handleConfirm}
            className="bg-[#FFC107] text-black hover:bg-[#FFD54F]"
          >
            Confirmar
          </OlimpoButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}