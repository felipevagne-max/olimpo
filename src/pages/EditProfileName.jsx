import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import OlimpoInput from '@/components/olimpo/OlimpoInput';
import { toast } from 'sonner';

const SESSION_KEY = 'olimpo_session';
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}

export default function EditProfileName() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const session = getSession();
  const user = session ? { email: session.email } : null;

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      return profiles[0] || null;
    },
    enabled: !!user?.email
  });

  useEffect(() => {
    if (userProfile?.displayName) {
      setUsername(userProfile.displayName);
    } else {
      setUsername('usuario');
    }
  }, [userProfile]);

  const handleSave = async () => {
    const trimmed = username.trim();

    if (!trimmed) {
      toast.error('Nome não pode ser vazio');
      return;
    }

    if (!userProfile?.id) {
      toast.error('Perfil não encontrado');
      return;
    }

    setIsSaving(true);

    try {
      await base44.entities.UserProfile.update(userProfile.id, {
        displayName: trimmed,
        username_last_changed_at: new Date().toISOString()
      });

      toast.success('Nome atualizado com sucesso!');
      navigate('/Dashboard');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error(error.message || 'Erro ao salvar nome');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pt-20 pb-24 px-4 flex flex-col">
      <div className="max-w-md mx-auto w-full flex flex-col flex-1">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#9AA0A6] hover:text-[#00FF66] mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Voltar</span>
        </button>

        {/* Edit Name Card */}
        <div className="bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)] rounded-2xl p-8 space-y-6 flex-1 flex flex-col justify-center">
          <div className="text-center space-y-2 mb-6">
            <h1 
              className="text-2xl font-bold text-[#E8E8E8]"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Alterar Nome
            </h1>
            <p className="text-sm text-[#9AA0A6]">
              Escolha um novo nome para seu perfil
            </p>
          </div>

          <OlimpoInput
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Digite seu novo nome"
            className="w-full text-center"
            autoFocus
            disabled={isSaving}
          />

          <div className="flex gap-3">
            <OlimpoButton
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
              disabled={isSaving}
              className="flex-1"
            >
              Cancelar
            </OlimpoButton>
            <OlimpoButton
              type="button"
              onClick={handleSave}
              disabled={isSaving || !username.trim()}
              className="flex-1"
            >
              {isSaving ? 'Salvando...' : 'Confirmar'}
            </OlimpoButton>
          </div>
        </div>
      </div>
    </div>
  );
}