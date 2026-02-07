import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import LevelCrest from '@/components/olimpo/LevelCrest';
import { LEVEL_TIERS } from '@/utils/levelSystem';
import { ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { useState } from 'react';

export default function LevelDetails() {
  const [expandedLevel, setExpandedLevel] = useState(null);

  const { data: xpTransactions = [] } = useQuery({
    queryKey: ['xpTransactions'],
    queryFn: () => base44.entities.XPTransaction.list()
  });

  const userXP = xpTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <OlimpoCard>
      <h3 
        className="text-sm font-semibold text-[#00FF66] mb-4"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        NÍVEIS E RECOMPENSAS
      </h3>

      <div className="space-y-2">
        {LEVEL_TIERS.map((tier) => {
          const isUnlocked = userXP >= tier.minXP;
          const isExpanded = expandedLevel === tier.index;

          return (
            <div
              key={tier.index}
              className={`border rounded-lg transition-all ${
                isUnlocked 
                  ? 'bg-[rgba(0,255,102,0.05)] border-[rgba(0,255,102,0.18)]'
                  : 'bg-[#070A08] border-[rgba(0,255,102,0.08)]'
              }`}
            >
              <button
                onClick={() => setExpandedLevel(isExpanded ? null : tier.index)}
                className="w-full p-3 flex items-center gap-3 hover:bg-[rgba(0,255,102,0.05)] transition-all"
              >
                <LevelCrest levelIndex={tier.index} size={48} locked={!isUnlocked} />
                
                <div className="flex-1 text-left">
                  <p 
                    className={`text-base font-semibold ${isUnlocked ? 'text-[#00FF66]' : 'text-[#9AA0A6]'}`}
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    {tier.name}
                  </p>
                  <p 
                    className="text-xs text-[#9AA0A6]"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {tier.minXP}–{tier.maxXP || '∞'} XP
                  </p>
                </div>

                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[#9AA0A6]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#9AA0A6]" />
                )}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 pt-0 space-y-3 border-t border-[rgba(0,255,102,0.08)] mt-2">
                  <p className="text-sm text-[#9AA0A6] italic">
                    {tier.description}
                  </p>

                  <div>
                    <p className="text-xs text-[#9AA0A6] mb-2 uppercase tracking-wide">
                      Recompensas:
                    </p>
                    {isUnlocked ? (
                      <div className="space-y-1">
                        {tier.rewards.map((reward, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-[#00FF66] text-sm">✓</span>
                            <p className="text-sm text-[#E8E8E8]">{reward}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-[rgba(0,255,102,0.05)] rounded-lg">
                        <Lock className="w-4 h-4 text-[#9AA0A6]" />
                        <p className="text-sm text-[#9AA0A6] blur-[2px]">
                          Recompensa oculta - desbloqueie este nível
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </OlimpoCard>
  );
}