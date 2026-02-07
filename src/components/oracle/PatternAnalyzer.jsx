import { format, subDays, getDay } from 'date-fns';

export function analyzePatterns(checkIns, tasks, habitLogs, habits) {
  const insights = [];
  const now = new Date();
  const last28Days = Array.from({ length: 28 }, (_, i) => 
    format(subDays(now, 27 - i), 'yyyy-MM-dd')
  );
  const last7Days = last28Days.slice(-7);

  // Análise A: Médias por dia da semana
  const weekdayStats = analyzeWeekdayPatterns(checkIns, tasks, habitLogs, habits, last28Days);
  
  // Insight 1: Melhor e pior dia
  if (weekdayStats.length > 0) {
    const sorted = [...weekdayStats].sort((a, b) => b.taskCompletion - a.taskCompletion);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    
    if (best && worst && best.taskCompletion - worst.taskCompletion > 0.2) {
      insights.push({
        title: `${best.dayName}: seu dia mais produtivo`,
        evidence: `Taxa de conclusão: ${(best.taskCompletion * 100).toFixed(0)}% vs ${worst.dayName}: ${(worst.taskCompletion * 100).toFixed(0)}%`,
        recommendation: `Use ${best.dayName} para tarefas críticas. Em ${worst.dayName}, comece com tarefas menores.`,
        severity: 'medium'
      });
    }
  }

  // Análise B: Sono → Performance no dia seguinte
  const sleepImpact = analyzeSleepImpact(checkIns, tasks, habitLogs, last7Days);
  if (sleepImpact) {
    insights.push(sleepImpact);
  }

  // Análise C: Sono alto → Humor baixo
  const sleepMoodCorrelation = analyzeSleepMoodCorrelation(checkIns, last28Days);
  if (sleepMoodCorrelation) {
    insights.push(sleepMoodCorrelation);
  }

  // Análise D: Tendência semanal
  const weeklyTrend = analyzeWeeklyTrend(tasks, habitLogs, last7Days);
  if (weeklyTrend) {
    insights.push(weeklyTrend);
  }

  return insights;
}

function analyzeWeekdayPatterns(checkIns, tasks, habitLogs, habits, days) {
  const weekdayData = {};
  
  days.forEach(date => {
    const dayOfWeek = getDay(new Date(date));
    const checkIn = checkIns.find(c => c.date === date);
    const dayTasks = tasks.filter(t => t.date === date);
    const completedTasks = dayTasks.filter(t => t.completed);
    const dayLogs = habitLogs.filter(l => l.date === date && l.completed);
    
    if (!weekdayData[dayOfWeek]) {
      weekdayData[dayOfWeek] = {
        dayName: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dayOfWeek],
        sleepScores: [],
        moodScores: [],
        productivityScores: [],
        taskCompletions: [],
        habitCompletions: []
      };
    }
    
    if (checkIn) {
      if (checkIn.sleepScore) weekdayData[dayOfWeek].sleepScores.push(checkIn.sleepScore);
      if (checkIn.moodScore) weekdayData[dayOfWeek].moodScores.push(checkIn.moodScore);
      if (checkIn.productivityScore) weekdayData[dayOfWeek].productivityScores.push(checkIn.productivityScore);
    }
    
    if (dayTasks.length > 0) {
      weekdayData[dayOfWeek].taskCompletions.push(completedTasks.length / dayTasks.length);
    }
    
    if (habits.length > 0) {
      weekdayData[dayOfWeek].habitCompletions.push(dayLogs.length / habits.length);
    }
  });
  
  return Object.values(weekdayData).map(data => ({
    dayName: data.dayName,
    avgSleep: avg(data.sleepScores),
    avgMood: avg(data.moodScores),
    avgProductivity: avg(data.productivityScores),
    taskCompletion: avg(data.taskCompletions),
    habitCompletion: avg(data.habitCompletions)
  }));
}

function analyzeSleepImpact(checkIns, tasks, habitLogs, days) {
  const pairs = [];
  
  for (let i = 0; i < days.length - 1; i++) {
    const today = days[i];
    const tomorrow = days[i + 1];
    
    const todayCheckIn = checkIns.find(c => c.date === today);
    const tomorrowTasks = tasks.filter(t => t.date === tomorrow);
    const tomorrowCompleted = tomorrowTasks.filter(t => t.completed);
    
    if (todayCheckIn?.sleepScore && tomorrowTasks.length > 0) {
      pairs.push({
        sleep: todayCheckIn.sleepScore,
        completion: tomorrowCompleted.length / tomorrowTasks.length
      });
    }
  }
  
  if (pairs.length < 5) return null;
  
  const lowSleep = pairs.filter(p => p.sleep <= 4);
  const highSleep = pairs.filter(p => p.sleep >= 7);
  
  if (lowSleep.length >= 2 && highSleep.length >= 2) {
    const lowSleepCompletion = avg(lowSleep.map(p => p.completion));
    const highSleepCompletion = avg(highSleep.map(p => p.completion));
    const diff = highSleepCompletion - lowSleepCompletion;
    
    if (Math.abs(diff) > 0.15) {
      return {
        title: diff > 0 ? 'Sono ruim trava seu dia seguinte' : 'Sono não está sendo o problema',
        evidence: `Sono ≤4: ${(lowSleepCompletion * 100).toFixed(0)}% conclusão. Sono ≥7: ${(highSleepCompletion * 100).toFixed(0)}%`,
        recommendation: diff > 0 
          ? 'Priorize 7h+ de sono. Defina horário fixo de desligar dispositivos.'
          : 'Sono não é o gargalo. Foque em planejamento e execução.',
        severity: diff > 0 ? 'high' : 'low'
      };
    }
  }
  
  return null;
}

function analyzeSleepMoodCorrelation(checkIns, days) {
  const validCheckIns = checkIns.filter(c => 
    days.includes(c.date) && c.sleepScore && c.moodScore
  );
  
  if (validCheckIns.length < 5) return null;
  
  const lowSleep = validCheckIns.filter(c => c.sleepScore <= 3);
  const normalSleep = validCheckIns.filter(c => c.sleepScore >= 4 && c.sleepScore <= 6);
  const highSleep = validCheckIns.filter(c => c.sleepScore >= 7);
  
  if (highSleep.length >= 3 && normalSleep.length >= 3) {
    const highSleepMood = avg(highSleep.map(c => c.moodScore));
    const normalSleepMood = avg(normalSleep.map(c => c.moodScore));
    const diff = normalSleepMood - highSleepMood;
    
    if (diff > 1.0) {
      return {
        title: 'Padrão incomum: dormir demais → humor pior',
        evidence: `Sono ≥7: humor ${highSleepMood.toFixed(1)}/10. Sono 4-6: humor ${normalSleepMood.toFixed(1)}/10`,
        recommendation: 'Isso pode indicar fuga ou compensação. Teste manter sono 6-7h com rotina matinal ativa.',
        severity: 'high'
      };
    }
  }
  
  return null;
}

function analyzeWeeklyTrend(tasks, habitLogs, days) {
  const thisWeek = days.slice(-7);
  const prevWeek = days.slice(-14, -7);
  
  const thisWeekActive = thisWeek.filter(date => {
    const dayTasks = tasks.filter(t => t.date === date && t.completed);
    const dayLogs = habitLogs.filter(l => l.date === date && l.completed);
    return dayTasks.length > 0 || dayLogs.length > 0;
  });
  
  const prevWeekActive = prevWeek.filter(date => {
    const dayTasks = tasks.filter(t => t.date === date && t.completed);
    const dayLogs = habitLogs.filter(l => l.date === date && l.completed);
    return dayTasks.length > 0 || dayLogs.length > 0;
  });
  
  const thisWeekRate = thisWeekActive.length / 7;
  const prevWeekRate = prevWeekActive.length / 7;
  const diff = thisWeekRate - prevWeekRate;
  
  if (Math.abs(diff) > 0.2) {
    return {
      title: diff > 0 ? 'Você está subindo' : 'Você está caindo',
      evidence: `${thisWeekActive.length}/7 dias ativos esta semana vs ${prevWeekActive.length}/7 semana passada`,
      recommendation: diff > 0 
        ? 'Mantém. Esse ritmo leva ao topo.'
        : 'Reset agora. Escolha 1 tarefa não negociável por dia e execute.',
      severity: diff > 0 ? 'low' : 'high'
    };
  }
  
  return null;
}

function avg(arr) {
  return arr.length > 0 ? arr.reduce((sum, v) => sum + v, 0) / arr.length : 0;
}

export function generateOracleResponse(userMessage, insights, checkIns, tasks, tone = 'direct') {
  const msg = userMessage.toLowerCase();
  
  // Quick responses
  if (msg.includes('errado') || msg.includes('problema')) {
    const highSeverity = insights.filter(i => i.severity === 'high');
    if (highSeverity.length > 0) {
      const insight = highSeverity[0];
      return formatResponse(
        `${insight.title}.\n\n${insight.evidence}\n\nAção: ${insight.recommendation}`,
        tone
      );
    }
    return formatResponse('Dados insuficientes. Complete mais 3-5 dias de check-in e tarefas.', tone);
  }
  
  if (msg.includes('plano') || msg.includes('amanhã')) {
    return formatResponse(
      'Plano para amanhã:\n1. Acorde e faça check-in (sono/humor)\n2. Escolha 3 tarefas máximo\n3. Comece pela menor (5 min de execução)\n4. Não negocie. Execute.',
      tone
    );
  }
  
  if (msg.includes('semana') || msg.includes('análise')) {
    if (insights.length > 0) {
      return formatResponse(
        insights.map(i => `${i.title}\n${i.evidence}\n→ ${i.recommendation}`).join('\n\n'),
        tone
      );
    }
    return formatResponse('Registre dados por mais 3 dias para análise completa.', tone);
  }
  
  if (msg.includes('sono')) {
    const sleepInsight = insights.find(i => i.title.toLowerCase().includes('sono'));
    if (sleepInsight) {
      return formatResponse(`${sleepInsight.title}\n${sleepInsight.evidence}\n\n${sleepInsight.recommendation}`, tone);
    }
    return formatResponse('Seu sono está estável. Se sentir cansaço, antecipe o horário de dormir em 30 min.', tone);
  }
  
  // Default
  return formatResponse(
    insights.length > 0 
      ? `${insights[0].title}\n${insights[0].evidence}\n\nAção: ${insights[0].recommendation}`
      : 'Ainda coletando padrões. Continue registrando seu progresso.',
    tone
  );
}

function formatResponse(content, tone) {
  const tones = {
    gentle: { prefix: '', suffix: ' 💚' },
    direct: { prefix: '', suffix: '' },
    firm: { prefix: 'Olha: ', suffix: '\n\nSem desculpa. Ação.' }
  };
  
  const t = tones[tone] || tones.direct;
  return `${t.prefix}${content}${t.suffix}`;
}