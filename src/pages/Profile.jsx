import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const SESSION_KEY = 'olimpo_session';
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
import { ArrowLeft, LogOut, RefreshCw } from 'lucide-react';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import OlimpoInput from '@/components/olimpo/OlimpoInput';
import SplashScreen from '@/components/olimpo/SplashScreen';
import { toast } from 'sonner';
import { getLevelFromXP } from '@/components/olimpo/levelSystem';
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

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNameEdit, setShowNameEdit] = useState(false);
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
      if (!user?.email) return null;
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      const profile = profiles[0] || null;
      if (profile) {
        setUsername(profile.displayName || 'USUARIO');
      }
      return profile;
    },
    enabled: !!user?.email
  });

  const { data: xpTransactions = [] } = useQuery({
    queryKey: ['xpTransactions'],
    queryFn: () => base44.entities.XPTransaction.list()
  });

  const xpTotal = xpTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const levelInfo = getLevelFromXP(xpTotal);

  const handleSaveClick = async () => {
    console.log('handleSaveClick CHAMADO');
    const trimmed = username.trim();
    console.log('Nome trimmed:', trimmed);
    console.log('UserProfile:', userProfile);
    
    if (!trimmed) {
      toast.error('Nome não pode ser vazio');
      return;
    }

    if (!userProfile?.id) {
      toast.error('Perfil não encontrado');
      return;
    }

    try {
      setIsSaving(true);
      console.log('Atualizando perfil...');
      
      await base44.entities.UserProfile.update(userProfile.id, {
        displayName: trimmed,
        username_last_changed_at: new Date().toISOString()
      });

      console.log('Perfil atualizado com sucesso');
      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate('/Dashboard');
      window.location.reload();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setIsSaving(false);
      toast.error(error.message || 'Erro ao salvar nome');
    }
  };

  const resetJourneyMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error('Usuário não encontrado');

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
      setTimeout(() => window.location.reload(), 500);
    },
    onError: () => {
      toast.error('Erro ao reiniciar jornada');
      setShowResetConfirm(false);
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

  if (isSaving) {
    return <SplashScreen />;
  }

  return (
    <div className="min-h-screen bg-black pt-20 pb-24 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#9AA0A6] hover:text-[#00FF66] mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Voltar</span>
        </button>

        {/* Profile Card */}
        <div className="bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)] rounded-2xl p-8 space-y-8">
          {/* User Info Centered */}
          <div className="text-center space-y-2">
            <h1 
              className="text-3xl font-bold text-[#E8E8E8]"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {userProfile?.displayName || 'USUARIO'}
            </h1>
            <p 
              className="text-sm text-[#9AA0A6]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {levelInfo.rankName} • Lv {levelInfo.nivelNum}
            </p>
          </div>

          {/* Alter Name Button */}
          {!showNameEdit && (
            <OlimpoButton
              onClick={() => setShowNameEdit(true)}
              className="w-full"
            >
              Alterar Nome
            </OlimpoButton>
          )}

          {/* Name Edit Box */}
          {showNameEdit && (
            <div className="space-y-4 p-6 bg-[#070A08] rounded-xl border border-[rgba(0,255,102,0.18)]">
              <OlimpoInput
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu novo nome"
                className="w-full text-center"
                autoFocus
              />
              <div className="flex gap-3">
                <OlimpoButton
                  variant="secondary"
                  onClick={() => {
                    setShowNameEdit(false);
                    setUsername(userProfile?.displayName || '');
                  }}
                  className="flex-1"
                >
                  Cancelar
                </OlimpoButton>
                <OlimpoButton
                  onClick={handleSaveClick}
                  disabled={isSaving || !username.trim()}
                  className="flex-1"
                >
                  Confirmar
                </OlimpoButton>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-[rgba(0,255,102,0.18)]" />

          {/* Actions */}
          <div className="space-y-3">
            <OlimpoButton
              variant="secondary"
              className="w-full text-[#FF3B3B] border-[rgba(255,59,59,0.3)] hover:bg-[rgba(255,59,59,0.1)]"
              onClick={() => setShowResetConfirm(true)}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reiniciar Jornada
            </OlimpoButton>

            <OlimpoButton
              variant="secondary"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </OlimpoButton>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
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
    </div>
  );
}