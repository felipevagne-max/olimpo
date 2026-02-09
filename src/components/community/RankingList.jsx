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
    if (position === 1) return '#FFD400'; // Gold tech
    if (position === 2) return '#A855F7'; // Purple tech
    if (position === 3) return '#00FFC8'; // Cyan tech
    if (position === 4) return '#00FF66'; // Matrix green
    if (position === 5) return '#FFB020'; // Amber tech
    if (position === 6) return '#14B8A6'; // Teal
    if (position === 7) return '#6366F1'; // Indigo
    if (position === 8) return '#84CC16'; // Lime
    if (position === 9) return '#22D3EE'; // Cyan light
    if (position === 10) return '#A78BFA'; // Purple light
    return 'rgba(0,255,102,0.3)'; // Subtle for 11+
  };

  const getPositionBadge = (position) => {
    const color = getPositionColor(position);
    const iconSize = 'w-4 h-4';
    const textSize = position <= 3 ? 'text-sm' : 'text-xs';
    
    if (position === 1) {
      return (
        <div className="flex items-center gap-1.5">
          <Trophy className={iconSize} style={{ color }} />
          <span className={`${textSize} font-bold`} style={{ fontFamily: 'Orbitron, sans-serif', color }}>
            #1
          </span>
        </div>
      );
    }
    if (position === 2) {
      return (
        <div className="flex items-center gap-1.5">
          <Medal className={iconSize} style={{ color }} />
          <span className={`${textSize} font-bold`} style={{ fontFamily: 'Orbitron, sans-serif', color }}>
            #2
          </span>
        </div>
      );
    }
    if (position === 3) {
      return (
        <div className="flex items-center gap-1.5">
          <Award className={iconSize} style={{ color }} />
          <span className={`${textSize} font-bold`} style={{ fontFamily: 'Orbitron, sans-serif', color }}>
            #3
          </span>
        </div>
      );
    }
    return (
      <span className={`${textSize} font-bold`} style={{ fontFamily: 'Orbitron, sans-serif', color }}>
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
    
    const maxTitles = 3;
    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
    const displayedTitles = equippedTitles.slice(0, maxTitles);
    const remainingCount = equippedTitles.length - maxTitles;
    
    return (
      <div className="flex gap-0.5 items-center">
        {displayedTitles.map(titleId => {
          const title = titleDefinitions.find(t => t.id === titleId);
          if (!title) return null;
          const color = TITLE_COLORS[title.name] || '#00FF66';
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
        {remainingCount > 0 && (
          <span className="text-[9px] text-[#9AA0A6] ml-0.5">+{remainingCount}</span>
        )}
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

      {/* TOP 10 - Compact Row Cards */}
      <div>
        <h3 
          className="text-sm font-bold text-[#00FF66] mb-3 uppercase"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          TOP 10
        </h3>
        <div className="space-y-1.5">
          {top10.map((user, idx) => {
            const position = idx + 1;
            const borderColor = getPositionColor(position);
            const firstTitle = user.equippedTitles[0] 
              ? titleDefinitions.find(t => t.id === user.equippedTitles[0])?.name 
              : null;
            
            return (
              <div
                key={user.id}
                className="relative flex items-center gap-3 p-3 lg:p-2.5 rounded-lg bg-[#0B0F0C] border transition-all hover:bg-[rgba(0,255,102,0.03)]"
                style={{
                  borderLeft: `3px solid ${borderColor}`,
                  borderTop: `1px solid rgba(0,255,102,0.1)`,
                  borderRight: `1px solid rgba(0,255,102,0.1)`,
                  borderBottom: `1px solid rgba(0,255,102,0.1)`,
                  boxShadow: position <= 3 ? `0 0 12px ${borderColor}15` : undefined
                }}
              >
                {/* Position */}
                <div className="w-10 lg:w-8 flex-shrink-0">
                  {getPositionBadge(position)}
                </div>

                {/* Avatar */}
                <Avatar className="w-8 h-8 lg:w-7 lg:h-7 border border-[rgba(0,255,102,0.2)]">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-[rgba(0,255,102,0.1)] text-[#00FF66] text-xs">
                    {getInitials(user.displayName)}
                  </AvatarFallback>
                </Avatar>

                {/* Name + Titles */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-sm lg:text-xs font-semibold text-[#E8E8E8] truncate">
                      {user.displayName || 'Herói'}
                    </p>
                    {renderTitles(user.equippedTitles, 'sm')}
                  </div>
                  {firstTitle && position <= 3 && (
                    <p className="text-[10px] text-[#9AA0A6] truncate">
                      {firstTitle}
                    </p>
                  )}
                </div>

                {/* Level Badge */}
                <span 
                  className="text-xs lg:text-[11px] px-2 py-0.5 rounded bg-[rgba(0,255,102,0.1)] text-[#00FF66] font-mono flex-shrink-0"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  LV {user.level}
                </span>

                {/* "Você" indicator */}
                {user.isCurrentUser && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#00FF66] text-black font-bold">
                    VOCÊ
                  </span>
                )}
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
            <div className="mb-3 flex items-center gap-3 p-2.5 rounded-lg bg-[rgba(0,255,102,0.08)] border-2 border-[#00FF66]">
              <span 
                className="text-xs font-bold text-[#00FF66] w-10"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                #{currentUserRank}
              </span>
              <Avatar className="w-7 h-7 border border-[rgba(0,255,102,0.3)]">
                <AvatarImage src={leaderboard[currentUserRank - 1]?.avatar_url} />
                <AvatarFallback className="bg-[rgba(0,255,102,0.15)] text-[#00FF66] text-xs">
                  {getInitials(leaderboard[currentUserRank - 1]?.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-[#E8E8E8] truncate">
                    {leaderboard[currentUserRank - 1]?.displayName || 'Você'}
                  </p>
                  {renderTitles(leaderboard[currentUserRank - 1]?.equippedTitles, 'sm')}
                </div>
              </div>
              <span 
                className="text-[11px] px-2 py-0.5 rounded bg-[rgba(0,255,102,0.15)] text-[#00FF66] font-mono"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                LV {leaderboard[currentUserRank - 1]?.level}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#00FF66] text-black font-bold">
                VOCÊ
              </span>
            </div>
          )}

          <div className="space-y-0.5 bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)] rounded-xl p-2">
            {others.map((user, idx) => {
              const position = idx + 11;
              
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-2.5 lg:gap-2 p-2 lg:p-1.5 rounded-lg hover:bg-[rgba(0,255,102,0.05)] transition-all"
                >
                  <span 
                    className="text-[11px] font-mono text-[#9AA0A6] w-8 lg:w-7"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    #{position}
                  </span>
                  
                  <Avatar className="w-7 h-7 lg:w-6 lg:h-6 border border-[rgba(0,255,102,0.15)]">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="bg-[rgba(0,255,102,0.1)] text-[#00FF66] text-xs">
                      {getInitials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs lg:text-[11px] text-[#E8E8E8] truncate">
                        {user.displayName || 'Herói'}
                      </p>
                      {renderTitles(user.equippedTitles, 'sm')}
                    </div>
                  </div>

                  <span 
                    className="text-[11px] lg:text-[10px] px-1.5 py-0.5 rounded bg-[rgba(0,255,102,0.1)] text-[#00FF66] font-mono"
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