import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import OlimpoInput from '../olimpo/OlimpoInput';
import OlimpoButton from '../olimpo/OlimpoButton';
import { toast } from 'sonner';

export default function EditExpenseSheet({ open, onClose, expense }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: expense?.title || '',
    amount: expense?.amount || '',
    date: expense?.date || '',
    payeeName: expense?.payeeName || '',
    categoryId: expense?.categoryId || '',
    planType: expense?.planType || 'PREVISTO'
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list()
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.update(expense.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      toast.success('Lançamento atualizado!');
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-[#E8E8E8]">
            Editar {expense?.type === 'receita' ? 'Entrada' : 'Saída'}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <Label className="text-[#9AA0A6] text-xs">
              {expense?.type === 'receita' ? 'Origem' : 'Compra'}
            </Label>
            <OlimpoInput
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Valor</Label>
            <OlimpoInput
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Data</Label>
            <OlimpoInput
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          {expense?.type === 'receita' && (
            <div>
              <Label className="text-[#9AA0A6] text-xs">Pagador</Label>
              <OlimpoInput
                value={formData.payer}
                onChange={(e) => setFormData({ ...formData, payer: e.target.value })}
              />
            </div>
          )}

          {expense?.type === 'despesa' && (
            <>
              <div>
                <Label className="text-[#9AA0A6] text-xs">Categoria</Label>
                <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                  <SelectTrigger className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
                    {categories.filter(c => c.type === 'expense').map(cat => (
                      <SelectItem key={cat.id} value={cat.id} className="text-[#E8E8E8]">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[#9AA0A6] text-xs">Tipo</Label>
                <Select value={formData.planType} onValueChange={(v) => setFormData({ ...formData, planType: v })}>
                  <SelectTrigger className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
                    <SelectItem value="PREVISTO" className="text-[#E8E8E8]">Programado</SelectItem>
                    <SelectItem value="IMPREVISTO" className="text-[#E8E8E8]">Não Programado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[#9AA0A6] text-xs">Observações</Label>
                <OlimpoInput
                  value={formData.payeeName}
                  onChange={(e) => setFormData({ ...formData, payeeName: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <OlimpoButton type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancelar
            </OlimpoButton>
            <OlimpoButton type="submit" className="flex-1" disabled={updateMutation.isPending}>
              Salvar
            </OlimpoButton>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}