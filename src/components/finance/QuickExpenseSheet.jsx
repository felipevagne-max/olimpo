import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import OlimpoInput from '../olimpo/OlimpoInput';
import OlimpoButton from '../olimpo/OlimpoButton';
import { toast } from 'sonner';

export default function QuickExpenseSheet({ open, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create({
      ...data,
      amount: parseFloat(data.amount),
      date: format(new Date(), 'yyyy-MM-dd'),
      type: 'despesa',
      status: 'pago',
      paymentMethod: 'debito',
      isUnplanned: true,
      category: 'outros'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      toast.success('Despesa registrada!');
      setFormData({ title: '', amount: '' });
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
        className="bg-[#0B0F0C] border-t border-[rgba(255,59,59,0.3)] rounded-t-2xl"
      >
        <SheetHeader className="pb-4">
          <SheetTitle 
            className="text-lg text-[#FF3B3B]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Nova Despesa (Débito/Pix)
          </SheetTitle>
          <p className="text-xs text-[#9AA0A6]">Registrado como pago imediatamente</p>
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
              placeholder="Ex: Almoço"
              required
            />
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