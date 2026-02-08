import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import LevelCrest from '@/components/olimpo/LevelCrest';
import { getLevelFromXP } from '@/components/olimpo/levelSystem';
import { TITLE_COLORS, TITLE_SYMBOLS } from '@/components/titles/TitleSymbols';
import { Trophy, Medal, Award } from 'lucide-react';

// Mock users for ranking (seed data)
const MOCK_USERS = [
  { id: 'mock1', name: 'Zeus', xp: 15000 },
  { id: 'mock2', name: 'Athena', xp: 13500 },
  { id: 'mock3', name: 'Poseidon', xp: 12000 },
  { id: 'mock4', name: 'Ares', xp: 10000 },
  { id: 'mock5', name: 'Hera', xp: 8500 },
  { id: 'mock6', name: 'Apollo', xp: 7000 },
  { id: 'mock7', name: 'Artemis', xp: 5500 },
  { id: 'mock8', name: 'Hermes', xp: 4000 },
  { id: 'mock9', name: 'Hades', xp: 2500 }
];

export default function RankingList() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me()
  });

  const { data: xpTransactions = [] } = useQuery({
    queryKey: ['xpTransactions'],
    queryFn: () => base44.entities.XPTransaction.list()
  });

  const { data: userTitles } = useQuery({
    queryKey: ['userTitles'],
    queryFn: async () => {
      const titles = await base44.entities.UserTitles.list();
      return titles[0] || null;
    }
  });

  const { data: titleDefinitions = [] } = useQuery({
    queryKey: ['titleDefinitions'],
    queryFn: () => base44.entities.TitleDefinition.list()
  });

  const userXP = xpTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  
  // Combine real user with mock users
  const allUsers = [
    ...MOCK_USERS,
    { 
      id: user?.id || 'current', 
      name: user?.full_name || 'Você', 
      xp: userXP,
      isCurrentUser: true 
    }
  ];

  // Sort by XP and take top 10
  const topUsers = allUsers
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10)
    .map((user, index) => ({
      ...user,
      position: index + 1,
      level: getLevelFromXP(user.xp)
    }));

  const getPositionIcon = (position) => {
    if (position === 1) return <Trophy className="w-5 h-5 text-[#FFD700]" />;
    if (position === 2) return <Medal className="w-5 h-5 text-[#C0C0C0]" />;
    if (position === 3) return <Award className="w-5 h-5 text-[#CD7F32]" />;
    return null;
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <OlimpoCard>
      <h3 
        className="text-sm font-semibold text-[#00FF66] mb-4"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        RANKING TOP 10
      </h3>

      <div className="space-y-2">
        {topUsers.map((user) => (
          <div
            key={user.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
              user.isCurrentUser
                ? 'bg-[rgba(0,255,102,0.1)] border-[#00FF66]'
                : 'bg-[#070A08] border-[rgba(0,255,102,0.08)] hover:border-[rgba(0,255,102,0.18)]'
            }`}
          >
            {/* Position */}
            <div className="w-8 flex items-center justify-center">
              {getPositionIcon(user.position) || (
                <span 
                  className="text-sm font-mono text-[#9AA0A6]"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  #{user.position}
                </span>
              )}
            </div>

            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-[rgba(0,255,102,0.15)] border border-[rgba(0,255,102,0.18)] flex items-center justify-center">
              <span className="text-xs font-semibold text-[#00FF66]">
                {getInitials(user.name)}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-[#E8E8E8] truncate">
                  {user.name}
                  {user.isCurrentUser && <span className="text-[#00FF66] ml-1">(Você)</span>}
                </p>
                {user.isCurrentUser && userTitles && (
                  <div className="flex gap-0.5">
                    {[userTitles.equippedTitle1, userTitles.equippedTitle2, userTitles.equippedTitle3]
                      .filter(Boolean)
                      .map(id => {
                        const title = titleDefinitions.find(t => t.id === id);
                        if (!title) return null;
                        const color = TITLE_COLORS[title.name] || '#00FF66';
                        return (
                          <div key={id} className="w-3 h-3" style={{ color }}>
                            {TITLE_SYMBOLS[title.name]}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <LevelCrest levelIndex={user.level.levelIndex} size={16} />
                <span className="text-xs text-[#9AA0A6]">{user.level.levelName}</span>
              </div>
            </div>

            {/* XP */}
            <div className="text-right">
              <p 
                className="text-sm font-mono text-[#00FF66]"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {user.xp.toLocaleString()}
              </p>
              <p className="text-xs text-[#9AA0A6]">XP</p>
            </div>
          </div>
        ))}
      </div>
    </OlimpoCard>
  );
}