import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import OlimpoInput from '@/components/olimpo/OlimpoInput';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import { ArrowLeft, Bell } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
    reminderTime: '09:00'
  });

  const { data: editHabit, isLoading: loadingEdit } = useQuery({
    queryKey: ['habit', editId],
    queryFn: async () => {
      if (!editId) return null;
      const habits = await base44.entities.Habit.list();
      return habits.find(h => h.id === editId);
    },
    enabled: !!editId
  });

  useEffect(() => {
    if (editHabit) {
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
        reminderTime: editHabit.reminderTime || '09:00'
      });
    }
  }, [editHabit]);

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
    <div className="min-h-screen bg-black pb-8">
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

              <div>
                <Label className="text-[#9AA0A6] text-xs">Horário</Label>
                <OlimpoInput
                  type="time"
                  value={formData.timeOfDay}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeOfDay: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-4">
              <Label className="text-[#9AA0A6] text-xs">Meta/Quantidade (opcional)</Label>
              <OlimpoInput
                value={formData.goalText}
                onChange={(e) => setFormData(prev => ({ ...prev, goalText: e.target.value }))}
                placeholder="Ex: 20 min, 2L, 10 páginas"
              />
            </div>
          </OlimpoCard>

          <OlimpoCard>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-[#00FF66]" />
                <div>
                  <p className="text-sm text-[#E8E8E8]">Lembrete</p>
                  <p className="text-xs text-[#9AA0A6]">Receba uma notificação</p>
                </div>
              </div>
              <Switch
                checked={formData.reminderEnabled}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, reminderEnabled: v }))}
                className="data-[state=checked]:bg-[#00FF66]"
              />
            </div>

            {formData.reminderEnabled && (
              <div className="mt-4">
                <Label className="text-[#9AA0A6] text-xs">Horário do Lembrete</Label>
                <OlimpoInput
                  type="time"
                  value={formData.reminderTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, reminderTime: e.target.value }))}
                />
              </div>
            )}
          </OlimpoCard>

          <div className="flex gap-3 pt-4">
            <OlimpoButton
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => navigate(createPageUrl('Habits'))}
            >
              Cancelar
            </OlimpoButton>
            <OlimpoButton
              type="submit"
              className="flex-1"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Salvando...' : editId ? 'Atualizar' : 'Criar Hábito'}
            </OlimpoButton>
          </div>
        </form>
      </div>
    </div>
  );
}