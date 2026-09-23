import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all users and their habits
    const users = await base44.asServiceRole.entities.User.list();
    
    let failedCount = 0;
    
    for (const user of users) {
      // Get habits for this user
      const habits = await base44.asServiceRole.entities.Habit.filter({
        archived: false,
        created_by: user.email
      });
      
      // Get yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      for (const habit of habits) {
        // Check if habit should run on yesterday
        const shouldRun = checkHabitSchedule(habit, yesterdayStr);
        
        if (shouldRun) {
          // Check if there's a log for yesterday
          const logs = await base44.asServiceRole.entities.HabitLog.filter({
            habitId: habit.id,
            date: yesterdayStr,
            created_by: user.email
          });
          
          // If no log exists, create a failed log
          if (logs.length === 0) {
            await base44.asServiceRole.entities.HabitLog.create({
              habitId: habit.id,
              date: yesterdayStr,
              completed: false,
              created_by: user.email
            });
            failedCount++;
          }
        }
      }
    }
    
    return Response.json({ 
      success: true, 
      failedHabitsMarked: failedCount 
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});

function checkHabitSchedule(habit, dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  
  if (habit.frequencyType === 'daily') {
    return true;
  }
  
  if (habit.frequencyType === 'weekdays' && habit.weekdays && habit.weekdays.length > 0) {
    const weekdayMap = {
      'dom': 0,
      'seg': 1,
      'ter': 2,
      'qua': 3,
      'qui': 4,
      'sex': 5,
      'sab': 6
    };
    
    const dayOfWeek = date.getDay();
    return habit.weekdays.some(day => weekdayMap[day] === dayOfWeek);
  }
  
  if (habit.frequencyType === 'timesPerWeek') {
    const dayOfWeek = date.getDay();
    const timesPerWeek = habit.timesPerWeek || 3;
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      return dayOfWeek <= timesPerWeek;
    }
    return false;
  }
  
  return false;
}