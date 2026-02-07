import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RANK_TIERS } from './levelSystem';
import LevelCrest from './LevelCrest';
import OlimpoProgress from './OlimpoProgress';
import { Lock } from 'lucide-react';

export default function LevelLadderModal({ open, onClose, currentLevelIndex, xpTotal, xpToNextLevel, nextLevelName }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)] text-[#E8E8E8] max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle 
            className="text-xl text-[#00FF66] text-center"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            ESCADA DE NÍVEIS
          </DialogTitle>
        </DialogHeader>

        {/* Current Status */}
        <div className="bg-[rgba(0,255,102,0.1)] border border-[rgba(0,255,102,0.18)] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-center gap-3 mb-3">
            <LevelCrest levelIndex={currentLevelIndex} size={48} />
            <div>
              <p className="text-sm text-[#9AA0A6]">Nível Atual</p>
              <p 
                className="text-lg font-semibold text-[#00FF66]"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {LEVEL_TIERS[currentLevelIndex - 1]?.name}
              </p>
            </div>
          </div>
          
          {xpToNextLevel > 0 && (
            <>
              <OlimpoProgress 
                value={xpTotal - LEVEL_TIERS[currentLevelIndex - 1].minXP} 
                max={(LEVEL_TIERS[currentLevelIndex]?.minXP || xpTotal) - LEVEL_TIERS[currentLevelIndex - 1].minXP}
                className="mb-2"
              />
              <p className="text-xs text-center text-[#9AA0A6]">
                Faltam <span className="text-[#00FF66] font-mono">{xpToNextLevel} XP</span> para {nextLevelName}
              </p>
            </>
          )}
        </div>

        {/* Level List */}
        <div className="space-y-2">
          {RANK_TIERS.map((tier) => {
            const userLevel = Math.floor(xpTotal / 200) + 1;
            const isUnlocked = userLevel >= tier.minLevel;
            const isCurrent = tier.index === currentLevelIndex;
            
            return (
              <div
                key={tier.index}
                className={`border rounded-lg p-3 transition-all ${
                  isCurrent 
                    ? 'bg-[rgba(0,255,102,0.15)] border-[#00FF66] shadow-[0_0_12px_rgba(0,255,102,0.2)]' 
                    : isUnlocked
                    ? 'bg-[rgba(0,255,102,0.05)] border-[rgba(0,255,102,0.18)]'
                    : 'bg-[#070A08] border-[rgba(0,255,102,0.08)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LevelCrest levelIndex={tier.index} size={40} locked={!isUnlocked} />
                  
                  <div className="flex-1">
                    <p 
                      className={`text-sm font-semibold ${isUnlocked ? 'text-[#00FF66]' : 'text-[#9AA0A6]'}`}
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      {tier.name}
                    </p>
                    <p 
                      className="text-xs text-[#9AA0A6]"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      Níveis {tier.minLevel}–{tier.maxLevel}
                    </p>
                  </div>

                  {!isUnlocked && (
                    <Lock className="w-4 h-4 text-[#9AA0A6]" />
                  )}
                </div>

                {/* Rewards */}
                <div className="mt-2 pl-[52px]">
                  {isUnlocked ? (
                    <div className="space-y-1">
                      {tier.rewards.map((reward, i) => (
                        <p key={i} className="text-xs text-[#00FF66]">
                          ✓ {reward}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-[#9AA0A6]" />
                      <p className="text-xs text-[#9AA0A6] blur-[3px]">Recompensa oculta</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}