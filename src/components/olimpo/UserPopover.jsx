import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, LogOut, Camera, Loader2, Download } from 'lucide-react';
import InstallPrompt from './InstallPrompt';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const fileInputRef = useRef(null);

  // Detect if app is installed (running as PWA)
  useState(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  window.navigator.standalone === true;
    setIsInstalled(isPWA);
  }, []);

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

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file) => {
      // Compress and resize image
      const compressed = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxSize = 512;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
              if (width > maxSize) {
                height = height * (maxSize / width);
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = width * (maxSize / height);
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });

      // Upload to storage with cache-bust timestamp
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
      const cacheBustUrl = `${file_url}?v=${Date.now()}`;
      
      // Update profile
      if (!userProfile?.id) throw new Error('Profile not found');
      await base44.entities.UserProfile.update(userProfile.id, { avatar_url: cacheBustUrl });
      
      return cacheBustUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userProfile']);
      queryClient.invalidateQueries(['user']);
      toast.success('Foto atualizada!');
      setUploadingAvatar(false);
    },
    onError: (error) => {
      toast.error('Não foi possível atualizar sua foto.');
      setUploadingAvatar(false);
    }
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }
    
    setUploadingAvatar(true);
    uploadAvatarMutation.mutate(file);
  };

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

  // Get initials from displayName or email
  const getInitials = () => {
    const name = userProfile?.displayName || user?.email || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  return (
    <>
    <input
      type="file"
      ref={fileInputRef}
      accept="image/*"
      capture={false}
      onChange={handleAvatarChange}
      className="hidden"
    />
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
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3 pb-4 border-b border-[rgba(0,255,102,0.18)]">
            <div className="relative">
              <Avatar className="w-20 h-20 border-2 border-[rgba(0,255,102,0.3)]">
                <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.displayName || user?.email} />
                <AvatarFallback className="bg-[#070A08] text-[#00FF66] text-xl font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-full">
                  <Loader2 className="w-6 h-6 text-[#00FF66] animate-spin" />
                </div>
              )}
            </div>
            <OlimpoButton
              variant="secondary"
              className="h-8 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
            >
              <Camera className="w-3 h-3 mr-1" />
              Trocar foto
            </OlimpoButton>
          </div>
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

          {/* Card Purchase Confirm Toggle */}
          <div className="pt-3 border-t border-[rgba(0,255,102,0.18)]">
            <div className="flex items-center justify-between">
              <Label className="text-[#9AA0A6] text-xs">Confirmar valores do cartão</Label>
              <Switch
                checked={!userProfile?.skipCardPurchaseConfirm}
                onCheckedChange={(checked) => updateProfileSettingMutation.mutate(!checked)}
                className="data-[state=checked]:bg-[#00FF66]"
              />
            </div>
          </div>

          {/* Install App - only show if not already installed */}
          {!isInstalled && (
            <OlimpoButton
              variant="secondary"
              className="w-full"
              onClick={() => {
                setShowInstallPrompt(true);
                setIsOpen(false);
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Adicionar à Tela Inicial
            </OlimpoButton>
          )}

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

    <InstallPrompt open={showInstallPrompt} onClose={() => setShowInstallPrompt(false)} />

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
              window.location.href = '/Dashboard';
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
  </>
  );
}