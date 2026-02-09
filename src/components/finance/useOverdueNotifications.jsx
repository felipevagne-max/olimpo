import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function useOverdueNotifications() {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list()
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    }
  });

  const createNotificationMutation = useMutation({
    mutationFn: async ({ type, title, body, entity_type, entity_id }) => {
      return base44.entities.UserNotification.create({
        type,
        title,
        body,
        entity_type,
        entity_id
      });
    }
  });

  const markNotifiedMutation = useMutation({
    mutationFn: async (expenseId) => {
      return base44.entities.Expense.update(expenseId, {
        overdue_notified_at: new Date().toISOString()
      });
    }
  });

  useEffect(() => {
    const checkOverdue = async () => {
      // Check for overdue expenses
      const overdueExpenses = expenses.filter(e => 
        !e.deleted_at &&
        e.status === 'programado' &&
        e.date < today &&
        !e.overdue_notified_at
      );

      for (const expense of overdueExpenses) {
        if (expense.type === 'receita') {
          // Income
          const substatus = expense.incomeSubstatus || 'PROGRAMADO';
          if (substatus === 'PROGRAMADO' || substatus === 'AGUARDANDO') {
            const title = 'Recebimento atrasado';
            const body = `${expense.title}${expense.payer ? ` (${expense.payer})` : ''} — previsto para ${format(new Date(expense.date), 'dd/MM/yyyy')}.`;
            
            await createNotificationMutation.mutateAsync({
              type: 'OVERDUE_INCOME',
              title,
              body,
              entity_type: 'expense',
              entity_id: expense.id
            });

            await markNotifiedMutation.mutateAsync(expense.id);

            if (userProfile?.notificationsEnabled) {
              toast.error(title, { description: body });
            }
          }
        } else {
          // Expense
          const title = 'Pagamento atrasado';
          const body = `${expense.title} — venceu em ${format(new Date(expense.date), 'dd/MM/yyyy')}.`;
          
          await createNotificationMutation.mutateAsync({
            type: 'OVERDUE_EXPENSE',
            title,
            body,
            entity_type: 'expense',
            entity_id: expense.id
          });

          await markNotifiedMutation.mutateAsync(expense.id);

          if (userProfile?.notificationsEnabled) {
            toast.error(title, { description: body });
          }
        }
      }

      if (overdueExpenses.length > 0) {
        queryClient.invalidateQueries(['expenses']);
        queryClient.invalidateQueries(['userNotifications']);
      }
    };

    if (expenses.length > 0) {
      checkOverdue();
    }
  }, [expenses.length, today]);
}