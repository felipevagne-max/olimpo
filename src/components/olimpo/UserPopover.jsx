import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, LogOut, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import OlimpoInput from './OlimpoInput';
import OlimpoButton from './OlimpoButton';
import SplashScreen from './SplashScreen';
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
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSaveClick = async () => {
    const trimmed = username.trim();
    
    if (!trimmed) {
      toast.error('Nome não pode ser vazio');
      return;
    }
    
    if (trimmed === userProfile?.displayName) {
      return;
    }

    // Check 24h lock
    if (userProfile?.username_last_changed_at) {
      const lastChanged = new Date(userProfile.username_last_changed_at);
      const now = new Date();
      const hoursSince = (now - lastChanged) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSince);
        toast.error(`Não permito, tente em ${hoursRemaining} ${hoursRemaining === 1 ? 'hora' : 'horas'}.`);
        return;
      }
    }

    // Check uniqueness
    const allProfiles = await base44.entities.UserProfile.list();
    const nameExists = allProfiles.some(p => 
      p.id !== userProfile?.id && 
      p.displayName?.toLowerCase() === trimmed.toLowerCase()
    );

    if (nameExists) {
      toast.error('Esse nome já está em uso.');
      return;
    }

    if (!userProfile?.id) {
      toast.error('Perfil não encontrado');
      return;
    }

    try {
      setIsSaving(true);
      setIsOpen(false);
      
      await base44.entities.UserProfile.update(userProfile.id, {
        displayName: trimmed,
        username_last_changed_at: new Date().toISOString()
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      window.location.reload();
    } catch (error) {
      setIsSaving(false);
      toast.error(error.message || 'Erro ao salvar nome');
    }
  };

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

  if (isSaving) {
    return <SplashScreen />;
  }

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
                disabled={isSaving || username === userProfile?.displayName}
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