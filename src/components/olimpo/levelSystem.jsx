// Sistema de Ranks e Níveis
// Cada rank possui 5 níveis
// Fórmula: nivelNum = floor(xpTotal / XP_PER_LEVEL) + 1
// rankIndex = floor((nivelNum - 1) / 5) + 1

const XP_PER_LEVEL = 200;

export const RANK_TIERS = [
  { 
    index: 1, 
    name: 'Iniciado', 
    minLevel: 1,
    maxLevel: 5,
    description: 'Todo grande herói começa aqui',
    rewards: ['Tema Matrix habilitado'],
    crestDesc: 'Semente do Raio'
  },
  { 
    index: 2, 
    name: 'Líder', 
    minLevel: 6,
    maxLevel: 10,
    description: 'Você inspira outros a agir',
    rewards: ['Chip de foco desbloqueado'],
    crestDesc: 'Raio do Comando'
  },
  { 
    index: 3, 
    name: 'Herói', 
    minLevel: 11,
    maxLevel: 15,
    description: 'Suas ações salvam o dia',
    rewards: ['Bônus de streak: +5 XP em 7 dias'],
    crestDesc: 'Escudo do Raio'
  },
  { 
    index: 4, 
    name: 'Lenda', 
    minLevel: 16,
    maxLevel: 20,
    description: 'Suas conquistas ecoam através do tempo',
    rewards: ['Slot extra de meta'],
    crestDesc: 'Coroa da Descarga'
  },
  { 
    index: 5, 
    name: 'Titã', 
    minLevel: 21,
    maxLevel: 25,
    description: 'Força colossal move montanhas',
    rewards: ['Animação especial de level up'],
    crestDesc: 'Fortaleza do Trovão'
  },
  { 
    index: 6, 
    name: 'Imortal', 
    minLevel: 26,
    maxLevel: 30,
    description: 'Transcende os limites mortais',
    rewards: ['Badge de Imortal no ranking'],
    crestDesc: 'Asas da Tempestade'
  },
  { 
    index: 7, 
    name: 'Semi-Deus', 
    minLevel: 31,
    maxLevel: 35,
    description: 'Entre mortais e divinos',
    rewards: ['Resumo avançado no Dashboard'],
    crestDesc: 'Halo do Relâmpago'
  },
  { 
    index: 8, 
    name: 'Olimpiano', 
    minLevel: 36,
    maxLevel: 40,
    description: 'O ápice do poder e glória',
    rewards: ['Aura Olympiana (UI highlight)'],
    crestDesc: 'Louro Supremo'
  }
];

export function getLevelFromXP(xpTotal) {
  const nivelNum = Math.floor(xpTotal / XP_PER_LEVEL) + 1;
  const rankIndex = Math.floor((nivelNum - 1) / 5) + 1;
  const currentRank = RANK_TIERS[Math.min(rankIndex - 1, RANK_TIERS.length - 1)];
  const nextRank = RANK_TIERS[rankIndex] || null;
  
  const xpInCurrentLevel = xpTotal % XP_PER_LEVEL;
  const levelProgressPercent = (xpInCurrentLevel / XP_PER_LEVEL) * 100;
  
  // Passo dentro do rank (1-5)
  const rankStep = ((nivelNum - 1) % 5) + 1;
  const levelsToNextRank = 5 - rankStep;
  
  return {
    nivelNum,
    rankIndex: currentRank.index,
    rankName: currentRank.name,
    rankDescription: currentRank.description,
    rankRewards: currentRank.rewards,
    rankStep,
    levelsToNextRank,
    levelProgressPercent,
    xpToNextLevel: XP_PER_LEVEL - xpInCurrentLevel,
    nextRankName: nextRank ? nextRank.name : 'Máximo',
    crestDesc: currentRank.crestDesc
  };
}