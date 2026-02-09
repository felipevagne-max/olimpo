import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import OlimpoButton from '../olimpo/OlimpoButton';
import { toast } from 'sonner';
import { Edit, Trash2 } from 'lucide-react';

export default function FinanceItemStatusPill({ item, type, onEdit }) {
  const queryClient = useQueryClient();
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get status display
  const getStatusDisplay = () => {
    if (type === 'income') {
      const substatus = item.incomeSubstatus || 'RECEBIDO';
      const config = {
        'RECEBIDO': { label: 'Recebido', color: 'bg-[#00FF66] text-black' },
        'PROGRAMADO': { label: 'Programado', color: 'bg-[#FFC107] text-black' },
        'AGUARDANDO': { label: 'Aguardando', color: 'bg-purple-500 text-white' },
        'ADIADO': { label: 'Adiado', color: 'bg-[#FF3B3B] text-white' },
        'PERDIDO': { label: 'Perdido', color: 'bg-[#9AA0A6] text-black' }
      };
      return config[substatus] || config.RECEBIDO;
    } else if (type === 'expense') {
      const isPaid = item.status === 'pago';
      return isPaid 
        ? { label: 'Pago', color: 'bg-[#00FF66] text-black' }
        : { label: 'Programado', color: 'bg-[#FFC107] text-black' };
    } else if (type === 'installment') {
      const isPaid = item.status === 'PAID';
      return isPaid
        ? { label: 'Pago', color: 'bg-[#00FF66] text-black' }
        : { label: 'Aberto', color: 'bg-[rgba(0,255,200,0.3)] text-[#00FFC8]' };
    }
  };

  const statusDisplay = getStatusDisplay();

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      if (type === 'income') {
        const updates = {};
        if (newStatus === 'RECEBIDO') {
          updates.status = 'pago';
          updates.paid_at = new Date().toISOString();
          updates.incomeSubstatus = 'RECEBIDO';
        } else {
          updates.status = 'programado';
          updates.paid_at = null;
          updates.incomeSubstatus = newStatus;
        }
        return base44.entities.Expense.update(item.id, updates);
      } else if (type === 'expense') {
        const updates = {};
        if (newStatus === 'PAGO') {
          updates.status = 'pago';
          updates.paid_at = new Date().toISOString();
        } else {
          updates.status = 'programado';
          updates.paid_at = null;
        }
        return base44.entities.Expense.update(item.id, updates);
      } else if (type === 'installment') {
        const updates = {};
        if (newStatus === 'PAID') {
          updates.status = 'PAID';
          updates.paidAt = new Date().toISOString();
        } else {
          updates.status = 'OPEN';
          updates.paidAt = null;
        }
        return base44.entities.CardInstallment.update(item.id, updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      queryClient.invalidateQueries(['cardInstallments']);
      queryClient.invalidateQueries(['cardPurchases']);
      toast.success('Status atualizado!');
      setShowActions(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (type === 'income' || type === 'expense') {
        return base44.entities.Expense.update(item.id, { 
          deleted_at: new Date().toISOString() 
        });
      } else if (type === 'installment') {
        // Soft delete installment
        return base44.entities.CardInstallment.update(item.id, {
          deleted_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      queryClient.invalidateQueries(['cardInstallments']);
      queryClient.invalidateQueries(['cardPurchases']);
      toast.success('Item excluído!');
      setShowDeleteConfirm(false);
      setShowActions(false);
    }
  });

  return (
    <>
      <button
        onClick={() => setShowActions(true)}
        className={`text-xs px-2 py-1 rounded-full font-medium transition-all hover:opacity-80 ${statusDisplay.color}`}
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      >
        {statusDisplay.label}
      </button>

      {/* Action Sheet */}
      <Sheet open={showActions} onOpenChange={setShowActions}>
        <SheetContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
          <SheetHeader>
            <SheetTitle className="text-[#E8E8E8]">Ações</SheetTitle>
          </SheetHeader>

          <div className="space-y-3 mt-6">
            {/* Status Options */}
            <div>
              <p className="text-xs text-[#9AA0A6] mb-2">Alterar status</p>
              <div className="space-y-2">
                {type === 'income' && (
                  <>
                    <OlimpoButton 
                      variant="secondary" 
                      className="w-full justify-start"
                      onClick={() => updateStatusMutation.mutate('RECEBIDO')}
                    >
                      Recebido
                    </OlimpoButton>
                    <OlimpoButton 
                      variant="secondary" 
                      className="w-full justify-start"
                      onClick={() => updateStatusMutation.mutate('PROGRAMADO')}
                    >
                      Programado
                    </OlimpoButton>
                    <OlimpoButton 
                      variant="secondary" 
                      className="w-full justify-start"
                      onClick={() => updateStatusMutation.mutate('AGUARDANDO')}
                    >
                      Aguardando
                    </OlimpoButton>
                    <OlimpoButton 
                      variant="secondary" 
                      className="w-full justify-start"
                      onClick={() => updateStatusMutation.mutate('ADIADO')}
                    >
                      Adiado
                    </OlimpoButton>
                    <OlimpoButton 
                      variant="secondary" 
                      className="w-full justify-start"
                      onClick={() => updateStatusMutation.mutate('PERDIDO')}
                    >
                      Perdido
                    </OlimpoButton>
                  </>
                )}
                {type === 'expense' && (
                  <>
                    <OlimpoButton 
                      variant="secondary" 
                      className="w-full justify-start"
                      onClick={() => updateStatusMutation.mutate('PAGO')}
                    >
                      Pago
                    </OlimpoButton>
                    <OlimpoButton 
                      variant="secondary" 
                      className="w-full justify-start"
                      onClick={() => updateStatusMutation.mutate('PROGRAMADO')}
                    >
                      Programado
                    </OlimpoButton>
                  </>
                )}
                {type === 'installment' && (
                  <>
                    <OlimpoButton 
                      variant="secondary" 
                      className="w-full justify-start"
                      onClick={() => updateStatusMutation.mutate('PAID')}
                    >
                      Pago
                    </OlimpoButton>
                    <OlimpoButton 
                      variant="secondary" 
                      className="w-full justify-start"
                      onClick={() => updateStatusMutation.mutate('OPEN')}
                    >
                      Aberto
                    </OlimpoButton>
                  </>
                )}
              </div>
            </div>

            {/* Edit */}
            {onEdit && (
              <OlimpoButton 
                variant="secondary" 
                className="w-full justify-start mt-4"
                onClick={() => {
                  setShowActions(false);
                  onEdit(item);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </OlimpoButton>
            )}

            {/* Delete */}
            <OlimpoButton 
              variant="secondary" 
              className="w-full justify-start text-[#FF3B3B] border-[#FF3B3B]"
              onClick={() => {
                setShowActions(false);
                setShowDeleteConfirm(true);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </OlimpoButton>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#E8E8E8]">
              Deseja excluir este lançamento?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#9AA0A6]">
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate()}
              className="bg-[#FF3B3B] text-white hover:bg-[#DD3333]"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}