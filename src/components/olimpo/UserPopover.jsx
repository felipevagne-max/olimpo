import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, LogOut } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import OlimpoInput from './OlimpoInput';
import OlimpoButton from './OlimpoButton';
import { toast } from 'sonner';

export default function UserPopover() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');

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

  const updateNameMutation = useMutation({
    mutationFn: async (newName) => {
      const trimmed = newName.trim();
      if (!trimmed) {
        throw new Error('Nome não pode ser vazio');
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
        displayName: trimmed
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userProfile']);
      toast.success('Nome atualizado.');
    },
    onError: (error) => {
      toast.error(error.message);
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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="p-2 text-[#9AA0A6] hover:text-[#00FF66] transition-colors rounded-lg hover:bg-[rgba(0,255,102,0.1)]">
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
                onClick={() => updateNameMutation.mutate(username)}
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
  );
}