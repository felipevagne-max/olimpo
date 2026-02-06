import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import OlimpoInput from '@/components/olimpo/OlimpoInput';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = ['Saúde', 'Finanças', 'Carreira', 'Estudos', 'Pessoal', 'Outro'];

export default function CreateGoal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    goalType: 'accumulative',
    targetValue: 100,
    currentValue: 0,
    unit: '',
    dueDate: '',
    xpOnComplete: 200
  });

  const [milestones, setMilestones] = useState([]);
  const [newMilestone, setNewMilestone] = useState('');

  const { data: editGoal, isLoading: loadingEdit } = useQuery({
    queryKey: ['goal', editId],
    queryFn: async () => {
      if (!editId) return null;
      const goals = await base44.entities.Goal.list();
      return goals.find(g => g.id === editId);
    },
    enabled: !!editId
  });

  const { data: existingMilestones = [] } = useQuery({
    queryKey: ['milestones', editId],
    queryFn: async () => {
      if (!editId) return [];
      return base44.entities.GoalMilestone.filter({ goalId: editId });
    },
    enabled: !!editId
  });

  useEffect(() => {
    if (editGoal) {
      setFormData({
        title: editGoal.title || '',
        description: editGoal.description || '',
        category: editGoal.category || '',
        goalType: editGoal.goalType || 'accumulative',
        targetValue: editGoal.targetValue || 100,
        currentValue: editGoal.currentValue || 0,
        unit: editGoal.unit || '',
        dueDate: editGoal.dueDate || '',
        xpOnComplete: editGoal.xpOnComplete || 200
      });
    }
  }, [editGoal]);

  useEffect(() => {
    if (existingMilestones.length > 0) {
      setMilestones(existingMilestones.map(m => ({ id: m.id, title: m.title, xpReward: m.xpReward || 30 })));
    }
  }, [existingMilestones]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let goal;
      if (editId) {
        goal = await base44.entities.Goal.update(editId, data);
      } else {
        goal = await base44.entities.Goal.create({ ...data, status: 'active' });
      }

      // Handle milestones for checklist type
      if (data.goalType === 'checklist') {
        // Delete old milestones if editing
        if (editId) {
          for (const m of existingMilestones) {
            await base44.entities.GoalMilestone.delete(m.id);
          }
        }
        // Create new milestones
        for (const m of milestones) {
          await base44.entities.GoalMilestone.create({
            goalId: goal.id || editId,
            title: m.title,
            xpReward: m.xpReward || 30,
            completed: false
          });
        }
      }

      return goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      queryClient.invalidateQueries(['milestones']);
      navigate(createPageUrl('Goals'));
    }
  });

  const addMilestone = () => {
    if (!newMilestone.trim()) return;
    setMilestones(prev => [...prev, { title: newMilestone, xpReward: 30 }]);
    setNewMilestone('');
  };

  const removeMilestone = (index) => {
    setMilestones(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    saveMutation.mutate(formData);
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
            onClick={() => navigate(createPageUrl('Goals'))}
            className="p-2 text-[#9AA0A6] hover:text-[#00FF66]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 
            className="text-xl font-bold text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {editId ? 'EDITAR META' : 'CRIAR META'}
          </h1>
        </div>
        <p className="text-[#9AA0A6] text-sm mb-6 ml-11">Defina sua próxima grande conquista.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <OlimpoCard>
            <div className="space-y-4">
              <div>
                <Label className="text-[#9AA0A6] text-xs">Título da Meta *</Label>
                <OlimpoInput
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Ler 50 livros"
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
          </OlimpoCard>

          <OlimpoCard>
            <Label className="text-[#9AA0A6] text-xs mb-3 block">Tipo de Meta *</Label>
            <div className="flex gap-2 mb-4">
              {[
                { value: 'accumulative', label: 'Acumulativa' },
                { value: 'checklist', label: 'Checklist' }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, goalType: opt.value }))}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.goalType === opt.value
                      ? 'bg-[#00FF66] text-black'
                      : 'bg-[#070A08] text-[#9AA0A6] border border-[rgba(0,255,102,0.18)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {formData.goalType === 'accumulative' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#9AA0A6] text-xs">Valor Objetivo</Label>
                  <OlimpoInput
                    type="number"
                    min={1}
                    value={formData.targetValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetValue: parseInt(e.target.value) || 100 }))}
                  />
                </div>
                <div>
                  <Label className="text-[#9AA0A6] text-xs">Unidade</Label>
                  <OlimpoInput
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="Ex: páginas, kg, R$"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-[#9AA0A6] text-xs">Valor Atual</Label>
                  <OlimpoInput
                    type="number"
                    min={0}
                    value={formData.currentValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentValue: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            )}

            {formData.goalType === 'checklist' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <OlimpoInput
                    value={newMilestone}
                    onChange={(e) => setNewMilestone(e.target.value)}
                    placeholder="Nova etapa..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMilestone())}
                  />
                  <OlimpoButton type="button" onClick={addMilestone}>
                    <Plus className="w-4 h-4" />
                  </OlimpoButton>
                </div>

                {milestones.length > 0 && (
                  <div className="space-y-2">
                    {milestones.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-[#070A08] rounded-lg">
                        <span className="flex-1 text-sm text-[#E8E8E8]">{m.title}</span>
                        <span className="text-xs font-mono text-[#00FF66]">+{m.xpReward} XP</span>
                        <button
                          type="button"
                          onClick={() => removeMilestone(i)}
                          className="p-1 text-[#FF3B3B] hover:bg-[rgba(255,59,59,0.1)] rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </OlimpoCard>

          <OlimpoCard>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#9AA0A6] text-xs">Prazo</Label>
                <OlimpoInput
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-[#9AA0A6] text-xs">XP ao Concluir</Label>
                <OlimpoInput
                  type="number"
                  min={1}
                  value={formData.xpOnComplete}
                  onChange={(e) => setFormData(prev => ({ ...prev, xpOnComplete: parseInt(e.target.value) || 200 }))}
                />
              </div>
            </div>
          </OlimpoCard>

          <div className="flex gap-3 pt-4">
            <OlimpoButton
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => navigate(createPageUrl('Goals'))}
            >
              Cancelar
            </OlimpoButton>
            <OlimpoButton
              type="submit"
              className="flex-1"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Salvando...' : editId ? 'Atualizar' : 'Criar Meta'}
            </OlimpoButton>
          </div>
        </form>
      </div>
    </div>
  );
}