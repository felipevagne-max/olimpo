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

    // Delete all records
    await Promise.all([
      ...tasks.map(t => base44.asServiceRole.entities.Task.delete(t.id)),
      ...habits.map(h => base44.asServiceRole.entities.Habit.delete(h.id)),
      ...habitLogs.map(l => base44.asServiceRole.entities.HabitLog.delete(l.id)),
      ...goals.map(g => base44.asServiceRole.entities.Goal.delete(g.id)),
      ...milestones.map(m => base44.asServiceRole.entities.GoalMilestone.delete(m.id)),
      ...xpTransactions.map(x => base44.asServiceRole.entities.XPTransaction.delete(x.id)),
      ...expenses.map(e => base44.asServiceRole.entities.Expense.delete(e.id)),
      ...checkIns.map(c => base44.asServiceRole.entities.CheckIn.delete(c.id)),
      ...notes.map(n => base44.asServiceRole.entities.Note.delete(n.id)),
      ...purchases.map(p => base44.asServiceRole.entities.CardPurchase.delete(p.id)),
      ...installments.map(i => base44.asServiceRole.entities.CardInstallment.delete(i.id)),
      ...categories.map(c => base44.asServiceRole.entities.Category.delete(c.id)),
      ...creditCards.map(c => base44.asServiceRole.entities.CreditCard.delete(c.id)),
      ...agendaItems.map(a => base44.asServiceRole.entities.AgendaItem.delete(a.id)),
      ...oracleInsights.map(o => base44.asServiceRole.entities.OracleInsight.delete(o.id)),
      ...userTitles.map(u => base44.asServiceRole.entities.UserTitles.delete(u.id)),
      ...communityPosts.map(p => base44.asServiceRole.entities.CommunityPost.delete(p.id))
    ]);

    // Reset all user profiles
    await Promise.all(
      userProfiles.map(profile => 
        base44.asServiceRole.entities.UserProfile.update(profile.id, {
          xpTotal: 0,
          levelIndex: 1,
          levelName: 'Herói',
          monthlyTargetXP: 2000,
          avatar_url: null
        })
      )
    );

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