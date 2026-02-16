import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import OlimpoInput from '@/components/olimpo/OlimpoInput';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import { ArrowLeft, Bell, Plus, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WEEKDAYS = [
  { value: 'seg', label: 'Seg' },
  { value: 'ter', label: 'Ter' },
  { value: 'qua', label: 'Qua' },
  { value: 'qui', label: 'Qui' },
  { value: 'sex', label: 'Sex' },
  { value: 'sab', label: 'Sáb' },
  { value: 'dom', label: 'Dom' },
];

const CATEGORIES = ['Saúde', 'Estudos', 'Trabalho', 'Mindset', 'Casa', 'Outro'];
const DIFFICULTIES = [
  { value: 'easy', label: 'Fácil', xp: 5 },
  { value: 'medium', label: 'Médio', xp: 10 },
  { value: 'hard', label: 'Difícil', xp: 15 },
  { value: 'epic', label: 'Épico', xp: 25 },
];

export default function CreateHabit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const goalId = searchParams.get('goalId');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequencyType: 'daily',
    weekdays: [],
    timesPerWeek: 3,
    timeOfDay: '',
    xpReward: 8,
    difficulty: 'medium',
    category: '',
    goalText: '',
    reminderEnabled: false,
    reminderTimes: [],
    goalId: goalId || null
  });
  const [newReminderTime, setNewReminderTime] = useState('09:00');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: editHabit, isLoading: loadingEdit } = useQuery({
    queryKey: ['habit', editId],
    queryFn: async () => {
      if (!editId || !user?.email) return null;
      const habits = await base44.entities.Habit.filter({ created_by: user.email });
      return habits.find(h => h.id === editId);
    },
    enabled: !!editId && !!user?.email
  });

  const { data: activeGoals = [] } = useQuery({
    queryKey: ['activeGoals'],
    queryFn: async () => {
      if (!user?.email) return [];
      const goals = await base44.entities.Goal.filter({ created_by: user.email });
      return goals.filter(g => g.status === 'active' && !g.deleted_at);
    },
    enabled: !!user?.email
  });

  useEffect(() => {
    if (editHabit) {
      // Migrate legacy reminderTime to reminderTimes
      let reminderTimes = editHabit.reminderTimes || [];
      if (reminderTimes.length === 0 && editHabit.reminderTime) {
        reminderTimes = [editHabit.reminderTime];
      }
      
      setFormData({
        name: editHabit.name || '',
        description: editHabit.description || '',
        frequencyType: editHabit.frequencyType || 'daily',
        weekdays: editHabit.weekdays || [],
        timesPerWeek: editHabit.timesPerWeek || 3,
        timeOfDay: editHabit.timeOfDay || '',
        xpReward: editHabit.xpReward || 8,
        difficulty: editHabit.difficulty || 'medium',
        category: editHabit.category || '',
        goalText: editHabit.goalText || '',
        reminderEnabled: editHabit.reminderEnabled || false,
        reminderTimes,
        goalId: editHabit.goalId || goalId || null
      });
    }
  }, [editHabit, goalId]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editId) {
        return base44.entities.Habit.update(editId, data);
      }
      return base44.entities.Habit.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['habits']);
      navigate(createPageUrl('Habits'));
    }
  });

  const toggleWeekday = (day) => {
    setFormData(prev => ({
      ...prev,
      weekdays: prev.weekdays.includes(day)
        ? prev.weekdays.filter(d => d !== day)
        : [...prev.weekdays, day]
    }));
  };

  const addReminderTime = () => {
    if (!newReminderTime) return;
    if (formData.reminderTimes.includes(newReminderTime)) {
      toast.error('Horário já adicionado');
      return;
    }
    if (formData.reminderTimes.length >= 10) {
      toast.error('Máximo de 10 horários');
      return;
    }
    
    const updated = [...formData.reminderTimes, newReminderTime].sort();
    setFormData(prev => ({ ...prev, reminderTimes: updated }));
    setNewReminderTime('09:00');
  };

  const removeReminderTime = (time) => {
    setFormData(prev => ({
      ...prev,
      reminderTimes: prev.reminderTimes.filter(t => t !== time)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    const xpReward = DIFFICULTIES.find(d => d.value === formData.difficulty)?.xp || 10;
    saveMutation.mutate({ ...formData, xpReward, archived: false });
  };

  if (editId && loadingEdit) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-32">
      <div className="px-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => navigate(createPageUrl('Habits'))}
            className="p-2 text-[#9AA0A6] hover:text-[#00FF66]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 
            className="text-xl font-bold text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {editId ? 'EDITAR HÁBITO' : 'CRIAR HÁBITO'}
          </h1>
        </div>
        <p className="text-[#9AA0A6] text-sm mb-6 ml-11">Defina sua próxima quest diária.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <OlimpoCard>
            <div className="space-y-4">
              <div>
                <Label className="text-[#9AA0A6] text-xs">Nome do Hábito *</Label>
                <OlimpoInput
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Beber 2L de água"
                  required
                />
              </div>

              <div>
                <Label className="text-[#9AA0A6] text-xs">Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalhes opcionais..."
                  className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8] placeholder:text-[#9AA0A6] focus:border-[#00FF66] resize-none"
                  rows={2}
                />
              </div>
            </div>
          </OlimpoCard>

          <OlimpoCard>
            <Label className="text-[#9AA0A6] text-xs mb-3 block">Frequência *</Label>
            <div className="flex gap-2 mb-4">
              {[
                { value: 'daily', label: 'Diário' },
                { value: 'weekdays', label: 'Dias da Semana' },
                { value: 'timesPerWeek', label: 'X vezes/semana' }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, frequencyType: opt.value }))}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    formData.frequencyType === opt.value
                      ? 'bg-[#00FF66] text-black'
                      : 'bg-[#070A08] text-[#9AA0A6] border border-[rgba(0,255,102,0.18)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {formData.frequencyType === 'weekdays' && (
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    className={`w-10 h-10 rounded-lg text-xs font-medium transition-all ${
                      formData.weekdays.includes(day.value)
                        ? 'bg-[#00FF66] text-black'
                        : 'bg-[#070A08] text-[#9AA0A6] border border-[rgba(0,255,102,0.18)]'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            )}

            {formData.frequencyType === 'timesPerWeek' && (
              <div className="flex items-center gap-3">
                <OlimpoInput
                  type="number"
                  min={1}
                  max={7}
                  value={formData.timesPerWeek}
                  onChange={(e) => setFormData(prev => ({ ...prev, timesPerWeek: parseInt(e.target.value) || 1 }))}
                  className="w-20"
                />
                <span className="text-[#9AA0A6] text-sm">vezes por semana</span>
              </div>
            )}
          </OlimpoCard>

          <OlimpoCard>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#9AA0A6] text-xs">Dificuldade *</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, difficulty: v }))}
                >
                  <SelectTrigger className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
                    {DIFFICULTIES.map(d => (
                      <SelectItem key={d.value} value={d.value} className="text-[#E8E8E8]">
                        {d.label} ({d.xp} XP)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[#9AA0A6] text-xs">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="text-[#E8E8E8]">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>

            <div className="mt-4">
              <Label className="text-[#9AA0A6] text-xs mb-2 block">Horários do Hábito</Label>
              
              {/* List of habit times */}
              {formData.reminderTimes.length > 0 && (
                <div className="space-y-2 mb-3">
                  {formData.reminderTimes.map((time, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-[#070A08] rounded-lg border border-[rgba(0,255,102,0.18)]"
                    >
                      <span 
                        className="flex-1 text-sm text-[#E8E8E8] font-mono"
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {time}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeReminderTime(time)}
                        className="p-1 text-[#9AA0A6] hover:text-[#FF3B3B] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new time */}
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={newReminderTime}
                  onChange={(e) => setNewReminderTime(e.target.value)}
                  className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]"
                  placeholder="Adicionar horário..."
                />
                <OlimpoButton
                  type="button"
                  onClick={addReminderTime}
                  className="px-3"
                  title="Adicionar horário"
                >
                  <Plus className="w-4 h-4" />
                </OlimpoButton>
              </div>
              <p className="text-xs text-[#9AA0A6] mt-2">
                {formData.reminderTimes.length}/10 horários • Adicione múltiplos horários para o hábito
              </p>
            </div>
          </OlimpoCard>

          <OlimpoCard>
            <div className="space-y-4">
              <div>
                <Label className="text-[#9AA0A6] text-xs">Horário Principal (legado)</Label>
                <OlimpoInput
                  type="time"
                  value={formData.timeOfDay}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeOfDay: e.target.value }))}
                  placeholder="Opcional"
                />
                <p className="text-xs text-[#9AA0A6] mt-1">
                  Use os horários acima. Este campo será removido em breve.
                </p>
              </div>

              <div>
                <Label className="text-[#9AA0A6] text-xs">Meta/Quantidade (opcional)</Label>
                <OlimpoInput
                  value={formData.goalText}
                  onChange={(e) => setFormData(prev => ({ ...prev, goalText: e.target.value }))}
                  placeholder="Ex: 20 min, 2L, 10 páginas"
                />
              </div>
            </div>
          </OlimpoCard>

          <OlimpoCard>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-[#00FF66]" />
                <div>
                  <p className="text-sm text-[#E8E8E8]">Lembretes por Notificação</p>
                  <p className="text-xs text-[#9AA0A6]">Ativar notificações push</p>
                </div>
              </div>
              <Switch
                checked={formData.reminderEnabled}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, reminderEnabled: v }))}
                className="data-[state=checked]:bg-[#00FF66]"
              />
            </div>
          </OlimpoCard>

          <OlimpoCard>
            <Label className="text-[#9AA0A6] text-xs mb-2 block">Vincular à meta (opcional)</Label>
            <Select
              value={formData.goalId || '_none'}
              onValueChange={(v) => setFormData(prev => ({ ...prev, goalId: v === '_none' ? null : v }))}
            >
              <SelectTrigger className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
                <SelectValue placeholder="Nenhuma meta" />
              </SelectTrigger>
              <SelectContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
                <SelectItem value="_none" className="text-[#9AA0A6]">Nenhuma meta</SelectItem>
                {activeGoals.map(goal => (
                  <SelectItem key={goal.id} value={goal.id} className="text-[#E8E8E8]">
                    {goal.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </OlimpoCard>

          {/* Fixed footer buttons - ALWAYS VISIBLE */}
          <div className="fixed bottom-0 left-0 right-0 bg-[#0B0F0C] border-t border-[rgba(0,255,102,0.18)] p-4 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
            <div className="flex gap-3 max-w-lg mx-auto">
              <OlimpoButton
                type="button"
                variant="secondary"
                className="flex-1 h-12 font-semibold"
                onClick={() => navigate(createPageUrl('Habits'))}
              >
                Cancelar
              </OlimpoButton>
              <OlimpoButton
                type="submit"
                className="flex-1 h-12 font-semibold"
                disabled={saveMutation.isPending || !formData.name.trim()}
              >
                {saveMutation.isPending ? 'Salvando...' : editId ? 'Salvar Alterações' : 'Criar Hábito'}
              </OlimpoButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}