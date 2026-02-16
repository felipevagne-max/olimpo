import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // CRITICAL: Only admins can reset all users
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all data from all users
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
      userProfiles,
      agendaItems,
      oracleInsights,
      userTitles,
      communityPosts
    ] = await Promise.all([
      base44.asServiceRole.entities.Task.list('-created_date', 10000),
      base44.asServiceRole.entities.Habit.list('-created_date', 10000),
      base44.asServiceRole.entities.HabitLog.list('-created_date', 10000),
      base44.asServiceRole.entities.Goal.list('-created_date', 10000),
      base44.asServiceRole.entities.GoalMilestone.list('-created_date', 10000),
      base44.asServiceRole.entities.XPTransaction.list('-created_date', 10000),
      base44.asServiceRole.entities.Expense.list('-created_date', 10000),
      base44.asServiceRole.entities.CheckIn.list('-created_date', 10000),
      base44.asServiceRole.entities.Note.list('-created_date', 10000),
      base44.asServiceRole.entities.CardPurchase.list('-created_date', 10000),
      base44.asServiceRole.entities.CardInstallment.list('-created_date', 10000),
      base44.asServiceRole.entities.Category.list('-created_date', 10000),
      base44.asServiceRole.entities.CreditCard.list('-created_date', 10000),
      base44.asServiceRole.entities.UserProfile.list('-created_date', 10000),
      base44.asServiceRole.entities.AgendaItem.list('-created_date', 10000),
      base44.asServiceRole.entities.OracleInsight.list('-created_date', 10000),
      base44.asServiceRole.entities.UserTitles.list('-created_date', 10000),
      base44.asServiceRole.entities.CommunityPost.list('-created_date', 10000)
    ]);

    // Delete all records in batches to avoid rate limits
    const batchSize = 50;
    
    const deleteInBatches = async (items, deleteFn) => {
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(item => deleteFn(item.id)));
      }
    };

    // Delete all data
    await deleteInBatches(tasks, (id) => base44.asServiceRole.entities.Task.delete(id));
    await deleteInBatches(habits, (id) => base44.asServiceRole.entities.Habit.delete(id));
    await deleteInBatches(habitLogs, (id) => base44.asServiceRole.entities.HabitLog.delete(id));
    await deleteInBatches(goals, (id) => base44.asServiceRole.entities.Goal.delete(id));
    await deleteInBatches(milestones, (id) => base44.asServiceRole.entities.GoalMilestone.delete(id));
    await deleteInBatches(xpTransactions, (id) => base44.asServiceRole.entities.XPTransaction.delete(id));
    await deleteInBatches(expenses, (id) => base44.asServiceRole.entities.Expense.delete(id));
    await deleteInBatches(checkIns, (id) => base44.asServiceRole.entities.CheckIn.delete(id));
    await deleteInBatches(notes, (id) => base44.asServiceRole.entities.Note.delete(id));
    await deleteInBatches(purchases, (id) => base44.asServiceRole.entities.CardPurchase.delete(id));
    await deleteInBatches(installments, (id) => base44.asServiceRole.entities.CardInstallment.delete(id));
    await deleteInBatches(categories, (id) => base44.asServiceRole.entities.Category.delete(id));
    await deleteInBatches(creditCards, (id) => base44.asServiceRole.entities.CreditCard.delete(id));
    await deleteInBatches(agendaItems, (id) => base44.asServiceRole.entities.AgendaItem.delete(id));
    await deleteInBatches(oracleInsights, (id) => base44.asServiceRole.entities.OracleInsight.delete(id));
    await deleteInBatches(userTitles, (id) => base44.asServiceRole.entities.UserTitles.delete(id));
    await deleteInBatches(communityPosts, (id) => base44.asServiceRole.entities.CommunityPost.delete(id));

    // Reset all user profiles
    for (const profile of userProfiles) {
      await base44.asServiceRole.entities.UserProfile.update(profile.id, {
        displayName: 'USUARIO',
        xpTotal: 0,
        levelIndex: 1,
        levelName: 'Herói',
        monthlyTargetXP: 2000,
        avatar_url: null
      });
    }

    return Response.json({ 
      success: true,
      message: 'Todos os dados foram resetados',
      stats: {
        tasks: tasks.length,
        habits: habits.length,
        habitLogs: habitLogs.length,
        goals: goals.length,
        milestones: milestones.length,
        xpTransactions: xpTransactions.length,
        expenses: expenses.length,
        checkIns: checkIns.length,
        notes: notes.length,
        purchases: purchases.length,
        installments: installments.length,
        categories: categories.length,
        creditCards: creditCards.length,
        agendaItems: agendaItems.length,
        oracleInsights: oracleInsights.length,
        userTitles: userTitles.length,
        communityPosts: communityPosts.length,
        userProfilesReset: userProfiles.length
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});