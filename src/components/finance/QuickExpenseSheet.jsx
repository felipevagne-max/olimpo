import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import OlimpoInput from '../olimpo/OlimpoInput';
import OlimpoButton from '../olimpo/OlimpoButton';
import { toast } from 'sonner';

export default function QuickExpenseSheet({ open, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'pago',
    planType: 'PREVISTO'
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const isPaid = data.status === 'pago';
      return base44.entities.Expense.create({
        title: data.title,
        amount: parseFloat(data.amount),
        date: data.date,
        type: 'despesa',
        status: data.status,
        paymentMethod: 'debit_pix',
        planType: data.planType,
        paid_at: isPaid ? new Date().toISOString() : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      toast.success('Despesa registrada!');
      setFormData({ 
        title: '', 
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'pago',
        planType: 'PREVISTO'
      });
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.amount || !formData.date || !formData.status || !formData.planType) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="bg-[#0B0F0C] border-t border-[rgba(255,59,59,0.3)] rounded-t-2xl"
      >
        <SheetHeader className="pb-4">
          <SheetTitle 
            className="text-lg text-[#FF3B3B]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Nova Despesa (Débito/Pix)
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-[#9AA0A6] text-xs">Valor (R$) *</Label>
            <OlimpoInput
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0,00"
              required
              autoFocus
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Compra *</Label>
            <OlimpoInput
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: mercado, gasolina, farmácia"
              required
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Data do pagamento *</Label>
            <OlimpoInput
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
            >
              <SelectTrigger className="bg-[#070A08] border-[rgba(255,59,59,0.3)] text-[#E8E8E8]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0B0F0C] border-[rgba(255,59,59,0.3)]">
                <SelectItem value="pago" className="text-[#E8E8E8]">PAGO</SelectItem>
                <SelectItem value="programado" className="text-[#E8E8E8]">PROGRAMADO</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Tipo de gasto *</Label>
            <Select
              value={formData.planType}
              onValueChange={(v) => setFormData(prev => ({ ...prev, planType: v }))}
            >
              <SelectTrigger className="bg-[#070A08] border-[rgba(255,59,59,0.3)] text-[#E8E8E8]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0B0F0C] border-[rgba(255,59,59,0.3)]">
                <SelectItem value="PREVISTO" className="text-[#E8E8E8]">PREVISTO</SelectItem>
                <SelectItem value="IMPREVISTO" className="text-[#E8E8E8]">IMPREVISTO</SelectItem>
              </SelectContent>
            </Select>
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
              className="flex-1 bg-[#FF3B3B] hover:bg-[#DD2B2B]"
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