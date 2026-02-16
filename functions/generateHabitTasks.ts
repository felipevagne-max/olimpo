import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get authenticated user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];
    let tasksCreated = 0;

    // Get user's active habits
    const habits = await base44.entities.Habit.filter({ 
      archived: false
    });

    for (const habit of habits) {
      // Check if habit should run today
      const shouldRunToday = checkHabitSchedule(habit, today);
      
      if (!shouldRunToday) continue;

      // Check if task already exists for this habit today
      const existingTasks = await base44.entities.Task.filter({
        habitId: habit.id,
        date: today
      });

      if (existingTasks.length > 0) continue; // Task already exists

      // Determine time of day
      let timeOfDay = '23:59'; // Default
      if (habit.reminderTimes && habit.reminderTimes.length > 0) {
        timeOfDay = habit.reminderTimes[0]; // Use first reminder time
      } else if (habit.timeOfDay) {
        timeOfDay = habit.timeOfDay;
      }

      // Create task from habit
      await base44.entities.Task.create({
        title: habit.name,
        description: habit.description || '',
        date: today,
        timeOfDay: timeOfDay,
        xpReward: habit.xpReward || 8,
        difficulty: habit.difficulty || 'medium',
        habitId: habit.id,
        goalId: habit.goalId || null,
        completed: false,
        archived: false
      });

      tasksCreated++;
    }

    return Response.json({ 
      success: true, 
      tasksCreated,
      date: today,
      userEmail: user.email
    });
  } catch (error) {
    console.error('Error in generateHabitTasks:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});

function checkHabitSchedule(habit, dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  
  console.log(`[checkHabitSchedule] Habit: ${habit.name}, Type: ${habit.frequencyType}, Date: ${dateStr}`);
  
  if (habit.frequencyType === 'daily') {
    console.log(`[checkHabitSchedule] Daily habit - MATCH`);
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
    const weekdayNames = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const matched = habit.weekdays.some(day => weekdayMap[day] === dayOfWeek);
    
    console.log(`[checkHabitSchedule] Weekday habit - dayOfWeek: ${dayOfWeek} (${weekdayNames[dayOfWeek]}), habit.weekdays: ${habit.weekdays.join(',')}, MATCH: ${matched}`);
    return matched;
  }
  
  if (habit.frequencyType === 'timesPerWeek') {
    // For timesPerWeek, generate tasks on weekdays evenly distributed
    // For simplicity, run on first N weekdays of the week
    const dayOfWeek = date.getDay();
    const timesPerWeek = habit.timesPerWeek || 3;
    
    // Map: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const matched = dayOfWeek <= timesPerWeek;
      console.log(`[checkHabitSchedule] TimesPerWeek habit - dayOfWeek: ${dayOfWeek}, timesPerWeek: ${timesPerWeek}, MATCH: ${matched}`);
      return matched;
    }
    console.log(`[checkHabitSchedule] TimesPerWeek habit - weekend, NO MATCH`);
    return false;
  }
  
  console.log(`[checkHabitSchedule] Unknown frequency type, NO MATCH`);
  return false;
}