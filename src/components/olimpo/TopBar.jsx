import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, BellOff } from 'lucide-react';
import OlimpoLogo from './OlimpoLogo';
import LevelLadderModal from './LevelLadderModal';
import { getLevelFromXP } from '@/lib/levelSystem';
import { toast } from 'sonner';

export default function TopBar() {
  const [showLevelModal, setShowLevelModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: xpTransactions = [] } = useQuery({
    queryKey: ['xpTransactions'],
    queryFn: () => base44.entities.XPTransaction.list()
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      if (profiles.length === 0) {
        return await base44.entities.UserProfile.create({
          displayName: 'Herói',
          xpTotal: 0,
          levelIndex: 1,
          levelName: 'Herói',
          notificationsEnabled: true
        });
      }
      return profiles[0];
    }
  });

  const toggleNotificationsMutation = useMutation({
    mutationFn: async (enabled) => {
      if (!userProfile?.id) return;
      return base44.entities.UserProfile.update(userProfile.id, { notificationsEnabled: enabled });
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries(['userProfile']);
      toast.success(enabled ? 'Notificações ativadas' : 'Notificações desativadas');
    }
  });

  const xpTotal = xpTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const levelInfo = getLevelFromXP(xpTotal);
  const notificationsEnabled = userProfile?.notificationsEnabled ?? true;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-[rgba(0,255,102,0.18)]">
      <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
        {/* Left: Level Badge (Clickable) */}
        <button
          onClick={() => setShowLevelModal(true)}
          className="flex items-center gap-1.5 bg-[#0B0F0C] px-3 py-1 rounded-full border border-[rgba(0,255,102,0.18)] hover:bg-[rgba(0,255,102,0.1)] transition-all"
        >
          <span className="text-[10px] text-[#9AA0A6] uppercase tracking-wide">Nível:</span>
          <span 
            className="text-xs font-semibold text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {levelInfo.levelName}
          </span>
        </button>

        {/* Center: Logo */}
        <div style={{ filter: 'drop-shadow(0 0 10px rgba(0,255,102,0.3))' }}>
          <OlimpoLogo size={32} glow={false} />
        </div>

        {/* Right: Notification Bell */}
        <button
          onClick={() => toggleNotificationsMutation.mutate(!notificationsEnabled)}
          className={`p-2 rounded-full transition-all ${
            notificationsEnabled 
              ? 'text-[#00FF66]' 
              : 'text-[#9AA0A6]'
          }`}
          style={{ filter: notificationsEnabled ? 'drop-shadow(0 0 8px rgba(0,255,102,0.4))' : 'none' }}
        >
          {notificationsEnabled ? (
            <Bell className="w-5 h-5" />
          ) : (
            <BellOff className="w-5 h-5" />
          )}
        </button>
      </div>

      <LevelLadderModal
        open={showLevelModal}
        onClose={() => setShowLevelModal(false)}
        currentLevelIndex={levelInfo.levelIndex}
        xpTotal={xpTotal}
        xpToNextLevel={levelInfo.xpToNextLevel}
        nextLevelName={levelInfo.nextLevelName}
      />
    </div>
  );
}