export const LEVEL_TIERS = [
  { 
    index: 1, 
    name: 'Iniciado', 
    minXP: 0, 
    maxXP: 199,
    description: 'Todo grande herói começa aqui',
    rewards: ['Tema Matrix habilitado']
  },
  { 
    index: 2, 
    name: 'Líder', 
    minXP: 200, 
    maxXP: 499,
    description: 'Você inspira outros a agir',
    rewards: ['Chip de foco desbloqueado']
  },
  { 
    index: 3, 
    name: 'Herói', 
    minXP: 500, 
    maxXP: 1199,
    description: 'Suas ações salvam o dia',
    rewards: ['Bônus de streak: +5 XP em 7 dias']
  },
  { 
    index: 4, 
    name: 'Lenda', 
    minXP: 1200, 
    maxXP: 2499,
    description: 'Suas conquistas ecoam através do tempo',
    rewards: ['Slot extra de meta']
  },
  { 
    index: 5, 
    name: 'Titã', 
    minXP: 2500, 
    maxXP: 4999,
    description: 'Força colossal move montanhas',
    rewards: ['Animação especial de level up']
  },
  { 
    index: 6, 
    name: 'Imortal', 
    minXP: 5000, 
    maxXP: 7999,
    description: 'Transcende os limites mortais',
    rewards: ['Badge de Imortal no ranking']
  },
  { 
    index: 7, 
    name: 'Semi-Deus', 
    minXP: 8000, 
    maxXP: 11999,
    description: 'Entre mortais e divinos',
    rewards: ['Resumo avançado no Dashboard']
  },
  { 
    index: 8, 
    name: 'Olimpiano', 
    minXP: 12000, 
    maxXP: null,
    description: 'O ápice do poder e glória',
    rewards: ['Aura Olympiana (UI highlight)']
  }
];

export function getLevelFromXP(xpTotal) {
  let currentLevel = LEVEL_TIERS[0];
  
  for (const tier of LEVEL_TIERS) {
    if (xpTotal >= tier.minXP) {
      currentLevel = tier;
    } else {
      break;
    }
  }
  
  const nextLevelIndex = currentLevel.index;
  const nextLevel = LEVEL_TIERS[nextLevelIndex];
  
  const xpInCurrentLevel = xpTotal - currentLevel.minXP;
  const xpNeededForNextLevel = nextLevel ? (nextLevel.minXP - currentLevel.minXP) : 0;
  const xpToNextLevel = nextLevel ? (nextLevel.minXP - xpTotal) : 0;
  
  return {
    levelIndex: currentLevel.index,
    levelName: currentLevel.name,
    levelDescription: currentLevel.description,
    levelRewards: currentLevel.rewards,
    xpCurrentLevel: xpInCurrentLevel,
    xpToNextLevel: xpToNextLevel,
    progressPercent: xpNeededForNextLevel > 0 ? (xpInCurrentLevel / xpNeededForNextLevel) * 100 : 100,
    nextLevelName: nextLevel ? nextLevel.name : 'Máximo'
  };
}