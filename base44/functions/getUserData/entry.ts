import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email;

    // Fetch all user-specific data using created_by filter
    const [
      tasks,
      habits,
      habitLogs,
      goals,
      milestones,
      xpTransactions,
      expenses,
      checkIns,
      notes,
      purchases,
      installments,
      categories,
      creditCards,
      userProfile
    ] = await Promise.all([
      base44.entities.Task.filter({ created_by: userEmail }),
      base44.entities.Habit.filter({ created_by: userEmail }),
      base44.entities.HabitLog.filter({ created_by: userEmail }),
      base44.entities.Goal.filter({ created_by: userEmail }),
      base44.entities.GoalMilestone.filter({ created_by: userEmail }),
      base44.entities.XPTransaction.filter({ created_by: userEmail }),
      base44.entities.Expense.filter({ created_by: userEmail }),
      base44.entities.CheckIn.filter({ created_by: userEmail }),
      base44.entities.Note.filter({ created_by: userEmail }),
      base44.entities.CardPurchase.filter({ created_by: userEmail }),
      base44.entities.CardInstallment.filter({ created_by: userEmail }),
      base44.entities.Category.filter({ created_by: userEmail }),
      base44.entities.CreditCard.filter({ created_by: userEmail }),
      base44.entities.UserProfile.filter({ created_by: userEmail })
    ]);

    return Response.json({
      tasks,
      habits,
      habitLogs,
      goals,
      milestones,
      xpTransactions,
      expenses,
      checkIns,
      notes,
      purchases,
      installments,
      categories,
      creditCards,
      userProfile: userProfile[0] || null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});