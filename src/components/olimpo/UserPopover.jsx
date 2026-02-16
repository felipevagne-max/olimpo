import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, LogOut, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import OlimpoInput from './OlimpoInput';
import OlimpoButton from './OlimpoButton';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function UserPopover() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      const profile = profiles[0] || null;
      if (profile) {
        setUsername(profile.displayName || '');
      }
      return profile;
    }
  });



  const playLightningSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(900, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(120, audioContext.currentTime + 0.18);
    
    gainNode.gain.setValueAtTime(0.35, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.18);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.18);
  };

  const updateNameMutation = useMutation({
    mutationFn: async (newName) => {
      const trimmed = newName.trim();
      if (!trimmed) {
        throw new Error('Nome não pode ser vazio');
      }

      // Check 1-day (24h) lock
      if (userProfile?.username_last_changed_at) {
        const lastChanged = new Date(userProfile.username_last_changed_at);
        const now = new Date();
        const hoursSince = (now - lastChanged) / (1000 * 60 * 60);
        if (hoursSince < 24) {
          const hoursRemaining = Math.ceil(24 - hoursSince);
          throw new Error(`Não permito, tente em ${hoursRemaining} ${hoursRemaining === 1 ? 'hora' : 'horas'}.`);
        }
      }

      // Check uniqueness (case-insensitive)
      const allProfiles = await base44.entities.UserProfile.list();
      const nameExists = allProfiles.some(p => 
        p.id !== userProfile?.id && 
        p.displayName?.toLowerCase() === trimmed.toLowerCase()
      );

      if (nameExists) {
        throw new Error('Esse nome já está em uso.');
      }

      if (!userProfile?.id) {
        throw new Error('Perfil não encontrado');
      }

      return base44.entities.UserProfile.update(userProfile.id, {
        displayName: trimmed,
        username_last_changed_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userProfile']);
      queryClient.invalidateQueries(['user']);
      setShowSuccess(true);
    },
    onError: (error) => {
      toast.error(error.message);
      setShowConfirm(false);
      setIsOpen(false); // Close popover on error
    }
  });

  const resetJourneyMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error('Usuário não encontrado');

      // Delete all user data
      const [tasks, habits, habitLogs, goals, milestones, xpTransactions, expenses, checkIns, notes, purchases, installments] = await Promise.all([
        base44.entities.Task.filter({ created_by: user.email }),
        base44.entities.Habit.filter({ created_by: user.email }),
        base44.entities.HabitLog.filter({ created_by: user.email }),
        base44.entities.Goal.filter({ created_by: user.email }),
        base44.entities.GoalMilestone.filter({ created_by: user.email }),
        base44.entities.XPTransaction.filter({ created_by: user.email }),
        base44.entities.Expense.filter({ created_by: user.email }),
        base44.entities.CheckIn.filter({ created_by: user.email }),
        base44.entities.Note.filter({ created_by: user.email }),
        base44.entities.CardPurchase.filter({ created_by: user.email }),
        base44.entities.CardInstallment.filter({ created_by: user.email })
      ]);

      // Delete all entities
      await Promise.all([
        ...tasks.map(t => base44.entities.Task.delete(t.id)),
        ...habits.map(h => base44.entities.Habit.delete(h.id)),
        ...habitLogs.map(l => base44.entities.HabitLog.delete(l.id)),
        ...goals.map(g => base44.entities.Goal.delete(g.id)),
        ...milestones.map(m => base44.entities.GoalMilestone.delete(m.id)),
        ...xpTransactions.map(x => base44.entities.XPTransaction.delete(x.id)),
        ...expenses.map(e => base44.entities.Expense.delete(e.id)),
        ...checkIns.map(c => base44.entities.CheckIn.delete(c.id)),
        ...notes.map(n => base44.entities.Note.delete(n.id)),
        ...purchases.map(p => base44.entities.CardPurchase.delete(p.id)),
        ...installments.map(i => base44.entities.CardInstallment.delete(i.id))
      ]);

      // Reset user profile
      if (userProfile?.id) {
        await base44.entities.UserProfile.update(userProfile.id, {
          xpTotal: 0,
          levelIndex: 1,
          levelName: 'Herói',
          monthlyTargetXP: 2000
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Jornada reiniciada com sucesso!');
      setShowResetConfirm(false);
      setIsOpen(false);
      setTimeout(() => window.location.reload(), 500);
    },
    onError: () => {
      toast.error('Erro ao reiniciar jornada');
      setShowResetConfirm(false);
    }
  });

  const handleSaveClick = () => {
    const trimmed = username.trim();
    
    if (!trimmed) {
      toast.error('Nome não pode ser vazio');
      return;
    }
    
    if (trimmed === userProfile?.displayName) {
      return;
    }

    // Check 24h lock before showing confirmation
    if (userProfile?.username_last_changed_at) {
      const lastChanged = new Date(userProfile.username_last_changed_at);
      const now = new Date();
      const hoursSince = (now - lastChanged) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSince);
        toast.error(`Não permito, tente em ${hoursRemaining} ${hoursRemaining === 1 ? 'hora' : 'horas'}.`);
        setIsOpen(false); // Close popover
        return;
      }
    }

    setPendingName(trimmed);
    setShowConfirm(true);
  };

  const confirmUpdate = () => {
    setShowConfirm(false);
    updateNameMutation.mutate(pendingName);
  };

  const updateProfileSettingMutation = useMutation({
    mutationFn: (skipConfirm) => {
      if (!userProfile?.id) return;
      return base44.entities.UserProfile.update(userProfile.id, {
        skipCardPurchaseConfirm: skipConfirm
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userProfile']);
      toast.success('Preferência atualizada!');
    }
  });

  const handleLogout = async () => {
    try {
      await base44.auth.logout();
      window.location.reload();
    } catch (error) {
      toast.error('Erro ao sair');
    }
  };

  // Calculate plan days remaining (if data exists)
  const planDaysRemaining = userProfile?.planExpiresAt 
    ? Math.max(0, Math.ceil((new Date(userProfile.planExpiresAt) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <>
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button 
          className="p-2 transition-colors rounded-lg hover:bg-[rgba(0,255,200,0.1)]"
          style={{ 
            color: 'rgba(0, 255, 200, 0.7)',
            filter: isOpen ? 'drop-shadow(0 0 6px rgba(0,255,200,0.3))' : 'none'
          }}
        >
          <User className="w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 bg-[#0B0F0C] border-[rgba(0,255,102,0.18)] p-0"
        align="end"
      >
        <div className="p-4 border-b border-[rgba(0,255,102,0.18)]">
          <h3 
            className="text-sm font-semibold text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            USUÁRIO
          </h3>
        </div>

        <div className="p-4 space-y-4">
          {/* Username - Editable */}
          <div>
            <Label className="text-[#9AA0A6] text-xs">Nome de usuário</Label>
            <div className="flex gap-2 mt-1">
              <OlimpoInput
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Seu nome"
                className="flex-1"
              />
              <OlimpoButton
                onClick={handleSaveClick}
                disabled={updateNameMutation.isPending || username === userProfile?.displayName}
                className="px-3"
              >
                Salvar
              </OlimpoButton>
            </div>
          </div>

          {/* Plan - Read only */}
          <div>
            <Label className="text-[#9AA0A6] text-xs">Plano</Label>
            <p 
              className="text-sm text-[#E8E8E8] mt-1 p-2 bg-[#070A08] rounded-lg"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {planDaysRemaining !== null ? `${planDaysRemaining} dias restantes` : '—'}
            </p>
          </div>

          {/* Reset Journey */}
          <OlimpoButton
            variant="secondary"
            className="w-full mt-2 text-[#FF3B3B] border-[rgba(255,59,59,0.3)] hover:bg-[rgba(255,59,59,0.1)]"
            onClick={() => setShowResetConfirm(true)}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reiniciar Jornada
          </OlimpoButton>

          {/* Logout */}
          <OlimpoButton
            variant="secondary"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </OlimpoButton>
        </div>
      </PopoverContent>
    </Popover>

    <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
      <AlertDialogContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#E8E8E8]">
            Herói, deseja realmente alterar seu nome?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[#9AA0A6]">
            Você não poderá alterar pelas próximas 24 horas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={confirmUpdate}
            className="bg-[#00FF66] text-black hover:bg-[#00DD55]"
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
      <AlertDialogContent className="bg-[#0B0F0C] border-[#3B82F6] border-2 relative overflow-hidden">
        {/* AZUL Lightning animation */}
        {showSuccess && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, rgba(59,130,246,0.25) 0%, transparent 70%)',
              animation: 'blue-lightning-pulse 700ms ease-out'
            }}
          />
        )}
        <style>{`
          @keyframes blue-lightning-pulse {
            0% { opacity: 0; transform: scale(0.85); }
            25% { opacity: 1; transform: scale(1.15); }
            50% { opacity: 0.9; transform: scale(1.05); }
            75% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(1.2); }
          }
          @keyframes blue-lightning-glow {
            0%, 100% { filter: drop-shadow(0 0 12px rgba(59,130,246,0.5)); }
            50% { filter: drop-shadow(0 0 24px rgba(59,130,246,0.9)); }
          }
        `}</style>
        <AlertDialogHeader>
          <AlertDialogTitle 
            className="text-center text-lg"
            style={{ 
              fontFamily: 'Orbitron, sans-serif',
              color: '#3B82F6',
              animation: showSuccess ? 'blue-lightning-glow 700ms ease-out' : 'none'
            }}
          >
            Tudo certo {pendingName}, sua jornada continua...
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction 
            onClick={() => {
              setShowSuccess(false);
              setIsOpen(false);
              queryClient.invalidateQueries();
              setTimeout(() => window.location.reload(), 100);
            }}
            className="font-semibold"
            style={{
              backgroundColor: '#3B82F6',
              color: 'white'
            }}
          >
            Continuar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
      <AlertDialogContent className="bg-[#0B0F0C] border-[rgba(255,59,59,0.4)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#FF3B3B]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            ⚠️ REINICIAR JORNADA
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[#9AA0A6]">
            Todos os seus dados serão <span className="text-[#FF3B3B] font-semibold">PERMANENTEMENTE APAGADOS</span>:
            <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
              <li>Experiência e níveis</li>
              <li>Tarefas e hábitos</li>
              <li>Metas e progressos</li>
              <li>Dados financeiros</li>
              <li>Check-ins e notas</li>
            </ul>
            <p className="mt-3 text-[#FF3B3B] font-semibold">Esta ação NÃO pode ser desfeita!</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => resetJourneyMutation.mutate()}
            disabled={resetJourneyMutation.isPending}
            className="bg-[#FF3B3B] text-white hover:bg-[#DD2222]"
          >
            {resetJourneyMutation.isPending ? 'Reiniciando...' : 'Confirmar Reinício'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}