import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import { TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function QuickInvestmentSheet({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [formData, setFormData] = useState({
    amount: '',
    location: '',
    type: '',
    notes: '',
    fromAccount: false
  });

  const createInvestmentMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Create investment record
      const investment = await base44.entities.Expense.create({
        title: 'Investimento',
        amount: parseFloat(data.amount),
        date: today,
        type: 'despesa', // Using despesa but marked as investment
        status: 'pago',
        paid_at: new Date().toISOString(),
        isInvestment: true,
        investmentLocation: data.location,
        investmentType: data.type,
        payeeName: data.notes || null
      });

      // 2. If fromAccount is ON, create linked expense (saída)
      if (data.fromAccount) {
        await base44.entities.Expense.create({
          title: 'Aporte (investimento)',
          amount: parseFloat(data.amount),
          date: today,
          type: 'despesa',
          status: 'pago',
          paid_at: new Date().toISOString(),
          isInvestmentTransfer: true,
          linkedTransactionId: investment.id,
          planType: 'PREVISTO',
          paymentMethod: 'debit_pix'
        });
      }

      return investment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      toast.success('Investimento registrado com sucesso!');
      setFormData({
        amount: '',
        location: '',
        type: '',
        notes: '',
        fromAccount: false
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Erro ao registrar investimento');
      console.error(error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    if (!formData.location.trim()) {
      toast.error('Informe onde guardou o investimento');
      return;
    }
    if (!formData.type.trim()) {
      toast.error('Informe o tipo do investimento');
      return;
    }

    createInvestmentMutation.mutate(formData);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="bg-[#0B0F0C] border-t border-[rgba(0,255,102,0.18)] rounded-t-2xl"
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-[#E8E8E8]">
            <TrendingUp className="w-5 h-5 text-[#00FF66]" />
            Novo Investimento
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-[#9AA0A6] text-xs mb-1.5 block">Valor *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]"
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs mb-1.5 block">Onde guardou *</Label>
            <Input
              type="text"
              placeholder="Ex: Tesouro Direto, Nubank, Corretora..."
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]"
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs mb-1.5 block">Tipo *</Label>
            <Input
              type="text"
              placeholder="Ex: Selic, CDB, Ações, Cripto..."
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]"
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs mb-1.5 block">OBS (opcional)</Label>
            <Textarea
              placeholder="Observações sobre o investimento..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8] min-h-[60px]"
            />
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-[#070A08] border border-[rgba(0,255,102,0.18)]">
            <Switch
              checked={formData.fromAccount}
              onCheckedChange={(checked) => setFormData({ ...formData, fromAccount: checked })}
              className="data-[state=checked]:bg-[#00FF66]"
            />
            <div className="flex-1">
              <Label className="text-[#E8E8E8] text-sm cursor-pointer">
                Saiu da conta
              </Label>
              <p className="text-xs text-[#9AA0A6] mt-0.5">
                {formData.fromAccount 
                  ? 'Cria automaticamente uma saída paga.'
                  : 'Apenas registra como investimento/posição.'}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <OlimpoButton
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </OlimpoButton>
            <OlimpoButton
              type="submit"
              className="flex-1"
              disabled={createInvestmentMutation.isPending}
            >
              {createInvestmentMutation.isPending ? 'Salvando...' : 'Salvar'}
            </OlimpoButton>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}