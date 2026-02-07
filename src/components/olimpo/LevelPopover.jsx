import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import LevelCrest from './LevelCrest';
import { ChevronRight } from 'lucide-react';

export default function LevelPopover({ children, levelInfo, xpTotal }) {
  const navigate = useNavigate();
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)] text-[#E8E8E8] w-72"
        align="start"
      >
        <div className="space-y-3">
          {/* Rank Atual */}
          <div>
            <p className="text-xs text-[#9AA0A6] mb-1 uppercase tracking-wide">Rank Atual</p>
            <div className="flex items-center gap-3">
              <LevelCrest levelIndex={levelInfo.rankIndex} size={48} />
              <div>
                <p 
                  className="text-lg font-bold text-[#00FF66]"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  {levelInfo.rankName}
                </p>
                <p 
                  className="text-sm text-[#9AA0A6]"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  Lv {levelInfo.nivelNum}
                </p>
              </div>
            </div>
          </div>

          {/* Progresso no Rank (5 etapas) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#9AA0A6]">Passo no Rank</p>
              <p 
                className="text-xs text-[#00FF66]"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {levelInfo.rankStep}/5
              </p>
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

          {/* Próximo Rank */}
          {levelInfo.levelsToNextRank > 0 && (
            <div className="pt-2 border-t border-[rgba(0,255,102,0.08)]">
              <p className="text-xs text-[#9AA0A6] mb-1">Próximo rank:</p>
              <p className="text-sm text-[#E8E8E8]">{levelInfo.nextRankName}</p>
              <p 
                className="text-xs text-[#9AA0A6] mt-1"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                Faltam {levelInfo.levelsToNextRank} níveis • ≈ {levelInfo.xpToNextLevel + (levelInfo.levelsToNextRank - 1) * 200} XP
              </p>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => navigate(createPageUrl('Community'))}
            className="w-full flex items-center justify-between p-2 rounded-lg border border-[rgba(0,255,102,0.18)] text-[#00FF66] hover:bg-[rgba(0,255,102,0.1)] transition-all text-sm"
          >
            <span>Ver ranks e recompensas</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}