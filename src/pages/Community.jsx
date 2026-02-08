import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import BottomNav from '@/components/olimpo/BottomNav';
import TopBar from '@/components/olimpo/TopBar';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoProgress from '@/components/olimpo/OlimpoProgress';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import RankingList from '@/components/community/RankingList';
import LevelDetails from '@/components/community/LevelDetails';
import LevelCrest from '@/components/olimpo/LevelCrest';
import MatrixColumns from '@/components/olimpo/MatrixColumns';
import { getLevelFromXP } from '@/components/olimpo/levelSystem';
import { User, Zap, Target } from 'lucide-react';

export default function Community() {
  const { data: xpTransactions = [], isLoading } = useQuery({
    queryKey: ['xpTransactions'],
    queryFn: () => base44.entities.XPTransaction.list()
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const xpTotal = xpTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const levelInfo = getLevelFromXP(xpTotal);

  return (
    <div className="min-h-screen bg-black pb-20 relative">
      <MatrixColumns opacity={0.03} />
      <TopBar />
      <div className="px-4 pt-20 relative z-10">
        <h1 
          className="text-xl font-bold text-[#00FF66] mb-6"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          COMUNIDADE
        </h1>

        {/* Status do Usuário */}
        <OlimpoCard className="mb-6" glow>
          <h3 
            className="text-sm font-semibold text-[#00FF66] mb-4"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            SEU STATUS
          </h3>
          
          {/* Identidade */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-[rgba(0,255,102,0.15)] flex items-center justify-center">
              <User className="w-6 h-6 text-[#00FF66]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#E8E8E8]">
                {userProfile?.displayName || user?.full_name || 'Herói'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <LevelCrest levelIndex={levelInfo.rankIndex} size={24} />
                <p className="text-xs text-[#9AA0A6]">
                  RANK: <span className="text-[#00FF66]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    {levelInfo.rankName}
                  </span>
                </p>
                <p className="text-xs text-[#9AA0A6]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  Lv {levelInfo.nivelNum}
                </p>
              </div>
            </div>
          </div>

          {/* XP e Progresso */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#00FF66]" />
                <span className="text-xs text-[#9AA0A6]">XP Total</span>
              </div>
              <span 
                className="text-sm font-bold text-[#00FF66]"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {xpTotal}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#9AA0A6]">Progresso do nível</span>
                <span 
                  className="text-xs text-[#00FF66]"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {levelInfo.levelProgressPercent.toFixed(0)}%
                </span>
              </div>
              <OlimpoProgress 
                value={levelInfo.levelProgressPercent} 
                max={100} 
                showLabel={false}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#9AA0A6]">Passo do rank</span>
                <span 
                  className="text-xs text-[#00FF66]"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {levelInfo.rankStep}/5
                </span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div
                    key={step}
                    className={`h-2 flex-1 rounded-full ${
                      step <= levelInfo.rankStep
                        ? 'bg-[#00FF66]'
                        : 'bg-[rgba(0,255,102,0.18)]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {levelInfo.levelsToNextRank > 0 && (
              <div className="pt-3 border-t border-[rgba(0,255,102,0.08)]">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#9AA0A6]" />
                  <div className="flex-1">
                    <p className="text-xs text-[#9AA0A6]">Próximo rank:</p>
                    <p className="text-sm text-[#00FF66]">{levelInfo.nextRankName}</p>
                  </div>
                  <p 
                    className="text-xs text-[#9AA0A6]"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    Faltam {levelInfo.levelsToNextRank} níveis
                  </p>
                </div>
              </div>
            )}
          </div>
        </OlimpoCard>

        {/* Níveis e Ranking */}
        <div className="space-y-6">
          <div>
            <h3 
              className="text-sm font-semibold text-[#E8E8E8] mb-3"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              NÍVEIS E RECOMPENSAS
            </h3>
            <LevelDetails />
          </div>

          <div>
            <h3 
              className="text-sm font-semibold text-[#E8E8E8] mb-3"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              RANKING TOP 10
            </h3>
            <RankingList />
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}