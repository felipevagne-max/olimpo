import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, LogOut } from 'lucide-react';
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
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  };

  const updateNameMutation = useMutation({
    mutationFn: async (newName) => {
      const trimmed = newName.trim();
      if (!trimmed) {
        throw new Error('Nome não pode ser vazio');
      }

      // Check 90-day lock
      if (userProfile?.username_last_changed_at) {
        const lastChanged = new Date(userProfile.username_last_changed_at);
        const now = new Date();
        const daysSince = Math.floor((now - lastChanged) / (1000 * 60 * 60 * 24));
        if (daysSince < 90) {
          const daysRemaining = 90 - daysSince;
          throw new Error(`Você poderá alterar novamente em ${daysRemaining} dias.`);
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
      setIsOpen(false);
      
      // Play lightning sound if SFX enabled
      const sfxEnabled = userProfile?.sfxEnabled ?? true;
      if (sfxEnabled) {
        playLightningSound();
      }
      
      setShowSuccess(true);
    },
    onError: (error) => {
      toast.error(error.message);
      setShowConfirm(false);
    }
  });

  const handleSaveClick = () => {
    const trimmed = username.trim();
    if (!trimmed || trimmed === userProfile?.displayName) return;

    // Check 90-day lock before showing confirmation
    if (userProfile?.username_last_changed_at) {
      const lastChanged = new Date(userProfile.username_last_changed_at);
      const now = new Date();
      const daysSince = Math.floor((now - lastChanged) / (1000 * 60 * 60 * 24));
      if (daysSince < 90) {
        const daysRemaining = 90 - daysSince;
        toast.error(`Você poderá alterar novamente em ${daysRemaining} dias.`);
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

          {/* Email - Read only */}
          <div>
            <Label className="text-[#9AA0A6] text-xs">E-mail</Label>
            <p 
              className="text-sm text-[#E8E8E8] mt-1 p-2 bg-[#070A08] rounded-lg"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {user?.email || '—'}
            </p>
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

          {/* Logout */}
          <OlimpoButton
            variant="secondary"
            className="w-full mt-2"
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
            Você não poderá alterar pelos próximos 90 dias.
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
      <AlertDialogContent className="bg-[#0B0F0C] border-[#00FF66] border-2 relative overflow-hidden">
        {/* Lightning animation */}
        {showSuccess && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, rgba(0,255,102,0.2) 0%, transparent 70%)',
              animation: 'lightning-pulse 800ms ease-out'
            }}
          />
        )}
        <style>{`
          @keyframes lightning-pulse {
            0% { opacity: 0; transform: scale(0.8); }
            30% { opacity: 1; transform: scale(1.1); }
            60% { opacity: 0.8; transform: scale(1); }
            100% { opacity: 0; transform: scale(1.2); }
          }
          @keyframes lightning-glow {
            0%, 100% { filter: drop-shadow(0 0 10px rgba(0,255,102,0.4)); }
            50% { filter: drop-shadow(0 0 20px rgba(0,255,102,0.8)); }
          }
        `}</style>
        <AlertDialogHeader>
          <AlertDialogTitle 
            className="text-[#00FF66] text-center text-lg"
            style={{ 
              fontFamily: 'Orbitron, sans-serif',
              animation: showSuccess ? 'lightning-glow 800ms ease-out' : 'none'
            }}
          >
            Tudo certo {pendingName}, sua jornada continua...
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction 
            onClick={() => setShowSuccess(false)}
            className="bg-[#00FF66] text-black hover:bg-[#00DD55] font-semibold"
          >
            Continuar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}