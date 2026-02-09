import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import LevelCrest from '@/components/olimpo/LevelCrest';
import { getLevelFromXP } from '@/components/olimpo/levelSystem';
import { TITLE_COLORS, TITLE_SYMBOLS } from '@/components/titles/TitleSymbols';
import { Trophy, Medal, Award, User } from 'lucide-react';

export default function RankingList() {
  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me()
  });

  const { data: allUserProfiles = [] } = useQuery({
    queryKey: ['allUserProfiles'],
    queryFn: () => base44.entities.UserProfile.list()
  });

  const { data: allXPTransactions = [] } = useQuery({
    queryKey: ['allXPTransactions'],
    queryFn: () => base44.entities.XPTransaction.list()
  });

  const { data: allUserTitles = [] } = useQuery({
    queryKey: ['allUserTitles'],
    queryFn: () => base44.entities.UserTitles.list()
  });

  const { data: titleDefinitions = [] } = useQuery({
    queryKey: ['titleDefinitions'],
    queryFn: () => base44.entities.TitleDefinition.list()
  });

  // Build leaderboard with real user data
  const leaderboard = allUserProfiles.map(profile => {
    const userXP = allXPTransactions
      .filter(tx => tx.created_by === profile.created_by)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    const levelInfo = getLevelFromXP(userXP);
    const userTitles = allUserTitles.find(t => t.created_by === profile.created_by);
    
    return {
      id: profile.id,
      email: profile.created_by,
      displayName: profile.displayName,
      avatar_url: profile.avatar_url,
      xpTotal: userXP,
      level: levelInfo.nivelNum,
      levelInfo,
      equippedTitles: [
        userTitles?.equippedTitle1,
        userTitles?.equippedTitle2,
        userTitles?.equippedTitle3
      ].filter(Boolean),
      isCurrentUser: profile.created_by === currentUser?.email
    };
  }).sort((a, b) => {
    // Sort by level DESC, then xpTotal DESC, then displayName ASC
    if (b.level !== a.level) return b.level - a.level;
    if (b.xpTotal !== a.xpTotal) return b.xpTotal - a.xpTotal;
    return (a.displayName || '').localeCompare(b.displayName || '');
  });

  const top10 = leaderboard.slice(0, 10);
  const others = leaderboard.slice(10, 60); // Limit to 50 more
  const currentUserRank = leaderboard.findIndex(u => u.isCurrentUser) + 1;

  const getPositionColor = (position) => {
    if (position === 1) return '#FFD700'; // Gold
    if (position === 2) return '#C0C0C0'; // Silver
    if (position === 3) return '#CD7F32'; // Bronze
    return '#00FF66'; // Matrix green for 4-10
  };

  const getPositionBadge = (position) => {
    const color = getPositionColor(position);
    
    if (position === 1) {
      return (
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6" style={{ color }} />
          <span className="text-2xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif', color }}>
            #1
          </span>
        </div>
      );
    }
    if (position === 2) {
      return (
        <div className="flex items-center gap-2">
          <Medal className="w-6 h-6" style={{ color }} />
          <span className="text-xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif', color }}>
            #2
          </span>
        </div>
      );
    }
    if (position === 3) {
      return (
        <div className="flex items-center gap-2">
          <Award className="w-6 h-6" style={{ color }} />
          <span className="text-xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif', color }}>
            #3
          </span>
        </div>
      );
    }
    return (
      <span className="text-lg font-bold" style={{ fontFamily: 'Orbitron, sans-serif', color }}>
        #{position}
      </span>
    );
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderTitles = (equippedTitles, size = 'md') => {
    if (!equippedTitles || equippedTitles.length === 0) return null;
    
    const maxTitles = size === 'sm' ? 2 : 3;
    
    return (
      <div className="flex gap-1">
        {equippedTitles.slice(0, maxTitles).map(titleId => {
          const title = titleDefinitions.find(t => t.id === titleId);
          if (!title) return null;
          const color = TITLE_COLORS[title.name] || '#00FF66';
          const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
          return (
            <div 
              key={titleId} 
              className={iconSize}
              style={{ color }}
              title={title.name}
            >
              {TITLE_SYMBOLS[title.name]}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 
          className="text-2xl font-bold text-[#00FF66] mb-1"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          RANKING
        </h2>
        <p className="text-sm text-[#9AA0A6]">Os heróis mais consistentes.</p>
        <p className="text-xs text-[#9AA0A6] mt-1">Ordenado por Level (XP total)</p>
      </div>

      {/* TOP 10 - Destaque */}
      <div>
        <h3 
          className="text-sm font-bold text-[#00FF66] mb-4 uppercase"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          TOP 10
        </h3>
        <div className="grid gap-4 lg:grid-cols-2">
          {top10.map((user, idx) => {
            const position = idx + 1;
            const isTop3 = position <= 3;
            
            return (
              <div
                key={user.id}
                className={`relative p-5 rounded-xl border-2 transition-all ${
                  user.isCurrentUser
                    ? 'bg-[rgba(0,255,102,0.08)] border-[#00FF66]'
                    : isTop3
                      ? 'bg-[#0B0F0C] border-[rgba(255,215,0,0.3)]'
                      : 'bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]'
                }`}
                style={
                  isTop3 && !user.isCurrentUser
                    ? { boxShadow: `0 0 20px ${getPositionColor(position)}15` }
                    : undefined
                }
              >
                {/* Position Badge */}
                <div className="flex items-start justify-between mb-3">
                  {getPositionBadge(position)}
                  {user.isCurrentUser && (
                    <span className="text-xs px-2 py-1 rounded-full bg-[#00FF66] text-black font-bold">
                      VOCÊ
                    </span>
                  )}
                </div>

                {/* User Info */}
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="w-16 h-16 border-2 border-[rgba(0,255,102,0.3)]">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="bg-[rgba(0,255,102,0.15)] text-[#00FF66] text-lg font-bold">
                      {getInitials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-base font-semibold text-[#E8E8E8] truncate">
                        {user.displayName || 'Herói'}
                      </p>
                      {renderTitles(user.equippedTitles)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-sm px-2 py-0.5 rounded bg-[rgba(0,255,102,0.15)] border border-[rgba(0,255,102,0.3)] text-[#00FF66] font-mono"
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        LV {user.level}
                      </span>
                      <LevelCrest levelIndex={user.levelInfo.levelIndex} size={20} />
                    </div>
                  </div>
                </div>

                {/* XP Total */}
                <div className="pt-3 border-t border-[rgba(0,255,102,0.1)]">
                  <p className="text-xs text-[#9AA0A6] mb-1">XP Total</p>
                  <p 
                    className="text-xl font-bold text-[#00FF66]"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {user.xpTotal.toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Demais Heróis */}
      {others.length > 0 && (
        <div>
          <h3 
            className="text-sm font-bold text-[#00FF66] mb-3 uppercase"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            DEMAIS HERÓIS
          </h3>

          {/* Current User Position (if not in top 10) */}
          {currentUserRank > 10 && (
            <div className="mb-3 p-3 rounded-lg bg-[rgba(0,255,102,0.08)] border-2 border-[#00FF66]">
              <p className="text-xs text-[#9AA0A6] mb-2">Sua posição:</p>
              <div className="flex items-center gap-3">
                <span 
                  className="text-sm font-bold text-[#00FF66]"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  #{currentUserRank}
                </span>
                <Avatar className="w-9 h-9 border border-[rgba(0,255,102,0.3)]">
                  <AvatarImage src={leaderboard[currentUserRank - 1]?.avatar_url} />
                  <AvatarFallback className="bg-[rgba(0,255,102,0.15)] text-[#00FF66] text-sm">
                    {getInitials(leaderboard[currentUserRank - 1]?.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#E8E8E8] truncate">
                      {leaderboard[currentUserRank - 1]?.displayName || 'Você'}
                    </p>
                    {renderTitles(leaderboard[currentUserRank - 1]?.equippedTitles, 'sm')}
                  </div>
                </div>
                <span 
                  className="text-xs px-2 py-1 rounded bg-[rgba(0,255,102,0.15)] text-[#00FF66] font-mono"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  LV {leaderboard[currentUserRank - 1]?.level}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-1 bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)] rounded-xl p-3">
            {others.map((user, idx) => {
              const position = idx + 11;
              
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-[rgba(0,255,102,0.05)] transition-all"
                >
                  <span 
                    className="text-xs font-mono text-[#9AA0A6] w-8"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    #{position}
                  </span>
                  
                  <Avatar className="w-9 h-9 border border-[rgba(0,255,102,0.18)]">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="bg-[rgba(0,255,102,0.1)] text-[#00FF66] text-xs">
                      {getInitials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-[#E8E8E8] truncate">
                        {user.displayName || 'Herói'}
                      </p>
                      {renderTitles(user.equippedTitles, 'sm')}
                    </div>
                  </div>

                  <span 
                    className="text-xs px-2 py-0.5 rounded bg-[rgba(0,255,102,0.1)] text-[#00FF66] font-mono"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    LV {user.level}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}