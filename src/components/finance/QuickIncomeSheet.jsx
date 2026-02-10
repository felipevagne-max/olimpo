import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import OlimpoInput from '../olimpo/OlimpoInput';
import OlimpoButton from '../olimpo/OlimpoButton';
import CurrencyInput from './CurrencyInput';
import { toast } from 'sonner';
import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'RECEBIDO', label: 'RECEBIDO', color: '#00FF66', icon: CheckCircle2 },
  { value: 'PROGRAMADO', label: 'PROGRAMADO', color: '#FFD400', icon: Clock },
  { value: 'AGUARDANDO', label: 'AGUARDANDO', color: '#A855F7', icon: AlertCircle },
  { value: 'ADIADO', label: 'ADIADO', color: '#FF3B3B', icon: XCircle }
];

export default function QuickIncomeSheet({ open, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    amount: '',
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    incomeSubstatus: 'RECEBIDO',
    payer: '',
    observation: ''
  });

  useEffect(() => {
    if (!open) {
      setFormData({
        amount: '',
        title: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        incomeSubstatus: 'RECEBIDO',
        payer: '',
        observation: ''
      });
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const isReceived = data.incomeSubstatus === 'RECEBIDO';
      
      const expense = await base44.entities.Expense.create({
        title: data.title,
        amount: parseFloat(data.amount),
        date: data.date,
        type: 'receita',
        status: isReceived ? 'pago' : 'programado',
        paid_at: isReceived ? new Date().toISOString() : null,
        incomeSubstatus: data.incomeSubstatus,
        payer: data.payer,
        payeeName: data.observation || `Pagador: ${data.payer}`
      });

      // Create agenda item if not received yet
      if (!isReceived) {
        try {
          const existing = await base44.entities.AgendaItem.filter({ 
            referenceType: 'transaction',
            referenceId: expense.id 
          });
          
          if (existing.length === 0) {
            await base44.entities.AgendaItem.create({
              date: data.date,
              title: `Receber: ${data.title}`,
              referenceType: 'transaction',
              referenceId: expense.id,
              status: 'OPEN'
            });
          }
        } catch (err) {
          console.error('Erro ao criar item de agenda:', err);
        }
      }

      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      queryClient.invalidateQueries(['agendaItems']);
      toast.success('Receita registrada!');
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.title.trim() || !formData.date || !formData.incomeSubstatus || !formData.payer.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    createMutation.mutate(formData);
  };

  const selectedStatus = STATUS_OPTIONS.find(s => s.value === formData.incomeSubstatus);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="bg-[#0B0F0C] border-t border-[rgba(0,255,102,0.3)] rounded-t-2xl max-h-[90vh] overflow-y-auto"
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
            <Label className="text-[#9AA0A6] text-xs">Valor *</Label>
            <CurrencyInput
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0,00"
              className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8] placeholder:text-[#9AA0A6] focus:border-[#00FF66]"
              required
              autoFocus
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Origem *</Label>
            <OlimpoInput
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Salário, Freela, Reembolso"
              required
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Quando entra *</Label>
            <OlimpoInput
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
            <p className="text-[10px] text-[#9AA0A6] mt-1">Data prevista</p>
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Status do recebimento *</Label>
            <Select
              value={formData.incomeSubstatus}
              onValueChange={(v) => setFormData(prev => ({ ...prev, incomeSubstatus: v }))}
            >
              <SelectTrigger className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
                <SelectValue>
                  {selectedStatus && (
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: selectedStatus.color }}
                      />
                      <span>{selectedStatus.label}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
                {STATUS_OPTIONS.map((status) => {
                  const Icon = status.icon;
                  return (
                    <SelectItem 
                      key={status.value} 
                      value={status.value}
                      className="text-[#E8E8E8]"
                    >
                      <div className="flex items-center gap-2">
                        <Icon 
                          className="w-4 h-4" 
                          style={{ color: status.color }}
                        />
                        <span>{status.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Pagador *</Label>
            <OlimpoInput
              value={formData.payer}
              onChange={(e) => setFormData(prev => ({ ...prev, payer: e.target.value }))}
              placeholder="Empresa X / Pessoa Y"
              required
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Observação</Label>
            <Textarea
              value={formData.observation}
              onChange={(e) => setFormData(prev => ({ ...prev, observation: e.target.value }))}
              placeholder="Detalhes rápidos..."
              className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8] placeholder:text-[#9AA0A6] focus:border-[#00FF66] resize-none"
              rows={2}
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