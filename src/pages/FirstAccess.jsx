import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import OlimpoLogo from '@/components/olimpo/OlimpoLogo';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import OlimpoInput from '@/components/olimpo/OlimpoInput';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import { toast } from 'sonner';

export default function FirstAccess() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [step, setStep] = useState('name'); // 'name' | 'password'
  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkFirstAccess();
  }, []);

  const checkFirstAccess = async () => {
    try {
      const user = await base44.auth.me();
      
      if (!user) {
        navigate('/');
        return;
      }

      // Buscar dados do usuário no Supabase via função backend
      const { data: userData } = await base44.functions.invoke('checkFirstLogin', {
        email: user.email
      });

      if (!userData.is_first_login) {
        // Não é primeiro acesso, redirecionar para dashboard
        navigate('/App');
        return;
      }

      if (userData.subscription_status !== 'active') {
        toast.error('Assinatura inválida ou expirada');
        await base44.auth.logout();
        return;
      }

      setUserId(userData.user_id);
      setLoading(false);
    } catch (error) {
      console.error('Error checking first access:', error);
      toast.error('Erro ao verificar acesso');
      navigate('/');
    }
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Por favor, informe seu nome');
      return;
    }
    setStep('password');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setSaving(true);

    try {
      const { data } = await base44.functions.invoke('changePassword', {
        userId,
        newPassword
      });

      if (data.success) {
        // Save display name to UserProfile
        try {
          await base44.entities.UserProfile.create({
            displayName: displayName.trim(),
            xpTotal: 0,
            levelIndex: 1,
            levelName: 'Herói',
            monthlyTargetXP: 2000
          });
        } catch (_) {}

        toast.success('Bem-vindo ao Olimpo!');
        setTimeout(() => {
          navigate('/App');
        }, 1000);
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error(error.response?.data?.error || 'Erro ao criar senha');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00FF66] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <OlimpoCard className="w-full max-w-md p-8" glow>
        <div className="flex flex-col items-center mb-8">
          <OlimpoLogo size={64} glow />
          <h1 
            className="text-2xl font-bold text-[#00FF66] mt-4"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            BEM-VINDO AO OLIMPO
          </h1>
          <p className="text-[#9AA0A6] text-sm mt-2 text-center">
            Primeiro acesso detectado
          </p>
        </div>

        <div className="bg-[rgba(0,255,102,0.1)] border border-[rgba(0,255,102,0.18)] rounded-lg p-4 mb-6">
          <p className="text-[#00FF66] text-sm text-center">
            Para continuar, por favor crie sua senha de acesso à plataforma.
          </p>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="text-[#E8E8E8] text-sm mb-2 block">Nova Senha</label>
            <div className="relative">
              <OlimpoInput
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite sua nova senha"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9AA0A6] hover:text-[#00FF66]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[#E8E8E8] text-sm mb-2 block">Confirmar Senha</label>
            <OlimpoInput
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite novamente sua senha"
              required
            />
          </div>

          <OlimpoButton
            type="submit"
            className="w-full"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Criar Senha e Continuar'
            )}
          </OlimpoButton>
        </form>
      </OlimpoCard>
    </div>
  );
}