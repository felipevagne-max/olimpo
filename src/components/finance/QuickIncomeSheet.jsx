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

export default function QuickIncomeSheet({ open, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'pago'
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create({
      ...data,
      amount: parseFloat(data.amount),
      type: 'receita',
      category: 'receita'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      toast.success('Receita registrada!');
      setFormData({ title: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), status: 'pago' });
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
        className="bg-[#0B0F0C] border-t border-[rgba(0,255,102,0.3)] rounded-t-2xl"
      >
        <SheetHeader className="pb-4">
          <SheetTitle 
            className="text-lg text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Nova Receita
          </SheetTitle>
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
            <Label className="text-[#9AA0A6] text-xs">Origem *</Label>
            <OlimpoInput
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Salário"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#9AA0A6] text-xs">Data</Label>
              <OlimpoInput
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div>
              <Label className="text-[#9AA0A6] text-xs">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
                  <SelectItem value="pago" className="text-[#E8E8E8]">Recebido</SelectItem>
                  <SelectItem value="programado" className="text-[#E8E8E8]">Programado</SelectItem>
                  <SelectItem value="pendente" className="text-[#E8E8E8]">Aguardando</SelectItem>
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
              className="flex-1"
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