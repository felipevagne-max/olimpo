import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import OlimpoInput from '../olimpo/OlimpoInput';
import OlimpoButton from '../olimpo/OlimpoButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const CARDS = ['Nubank', 'Inter', 'C6', 'Itaú', 'Bradesco', 'Outro'];

export default function QuickCardSheet({ open, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    cardName: 'Nubank',
    installments: '1'
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create({
      ...data,
      amount: parseFloat(data.amount),
      installments: parseInt(data.installments),
      date: format(new Date(), 'yyyy-MM-dd'),
      type: 'despesa',
      status: 'pendente',
      paymentMethod: 'cartao',
      category: 'outros'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      toast.success('Compra no cartão registrada!');
      setFormData({ title: '', amount: '', cardName: 'Nubank', installments: '1' });
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.amount) return;
    createMutation.mutate(formData);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="bg-[#0B0F0C] border-t border-[rgba(255,193,7,0.3)] rounded-t-2xl"
      >
        <SheetHeader className="pb-4">
          <SheetTitle 
            className="text-lg text-[#FFC107]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Compra no Cartão
          </SheetTitle>
          <p className="text-xs text-[#9AA0A6]">Entra na fatura do cartão</p>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-[#9AA0A6] text-xs">Valor (R$) *</Label>
            <OlimpoInput
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0,00"
              required
              autoFocus
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Descrição *</Label>
            <OlimpoInput
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Compras supermercado"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#9AA0A6] text-xs">Cartão</Label>
              <Select
                value={formData.cardName}
                onValueChange={(v) => setFormData(prev => ({ ...prev, cardName: v }))}
              >
                <SelectTrigger className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
                  {CARDS.map(card => (
                    <SelectItem key={card} value={card} className="text-[#E8E8E8]">
                      {card}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[#9AA0A6] text-xs">Parcelas</Label>
              <Select
                value={formData.installments}
                onValueChange={(v) => setFormData(prev => ({ ...prev, installments: v }))}
              >
                <SelectTrigger className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={String(n)} className="text-[#E8E8E8]">
                      {n}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <OlimpoButton
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </OlimpoButton>
            <OlimpoButton
              type="submit"
              className="flex-1 bg-[#FFC107] text-black hover:bg-[#FFD54F]"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Salvando...' : 'Salvar'}
            </OlimpoButton>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}