import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import OlimpoInput from '@/components/olimpo/OlimpoInput';
import { Repeat, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

export default function TaskModal({ open, onClose, task, defaultDate, goalId }) {
  const queryClient = useQueryClient();
  
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: activeGoals = [] } = useQuery({
    queryKey: ['activeGoals'],
    queryFn: async () => {
      if (!user?.email) return [];
      const goals = await base44.entities.Goal.filter({ created_by: user.email });
      return goals.filter(g => g.status === 'active' && !g.deleted_at);
    },
    enabled: open && !!user?.email
  });

  const { data: activeProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!user?.email) return [];
      const projects = await base44.entities.Project.filter({ created_by: user.email });
      return projects.filter(p => p.status === 'active');
    },
    enabled: open && !!user?.email
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: defaultDate,
    dueDate: '',
    timeOfDay: '',
    priority: 'medium',
    difficulty: 'medium',
    isRecurring: false,
    recurringDays: [],
    xpReward: 10,
    goalId: goalId || null,
    projectId: null
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        date: task.date || defaultDate,
        dueDate: task.dueDate || '',
        timeOfDay: task.timeOfDay || '',
        priority: task.priority || 'medium',
        difficulty: task.difficulty || 'medium',
        isRecurring: task.isRecurring || false,
        recurringDays: task.recurringDays || [],
        xpReward: task.xpReward || 10,
        goalId: task.goalId || goalId || null,
        projectId: task.projectId || null
      });
    } else {
      setFormData({
        title: '',
        description: '',
        date: defaultDate,
        dueDate: '',
        timeOfDay: '',
        priority: 'medium',
        difficulty: 'medium',
        isRecurring: false,
        recurringDays: [],
        xpReward: 10,
        goalId: goalId || null,
        projectId: null
      });
    }
  }, [task, defaultDate, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (task) {
        return base44.entities.Task.update(task.id, data);
      }
      return base44.entities.Task.create({ ...data, completed: false, archived: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      onClose();
    }
  });

  const toggleWeekday = (day) => {
    setFormData(prev => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(day)
        ? prev.recurringDays.filter(d => d !== day)
        : [...prev.recurringDays, day]
    }));
  };

  const calculateTaskXP = (difficulty, priority, dueDate) => {
    const baseXP = {
      easy: 5,
      medium: 10,
      hard: 15,
      epic: 25
    }[difficulty] || 10;
    
    let bonus = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    
    if (priority === 'high') {
      bonus = 0.5;
    } else if (priority === 'medium') {
      bonus = 0.2;
    }
    
    if (dueDate) {
      const daysUntilDue = Math.ceil((new Date(dueDate) - new Date(today)) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 1) {
        bonus = Math.max(bonus, 0.5);
      }
      if (daysUntilDue < 0) {
        bonus = 0.7;
      }
    }
    
    return Math.round(baseXP * (1 + bonus));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    const calculatedXP = calculateTaskXP(formData.difficulty, formData.priority, formData.dueDate);
    saveMutation.mutate({ ...formData, xpReward: calculatedXP });
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="bg-[#0B0F0C] border-t border-[rgba(0,255,102,0.18)] rounded-t-2xl max-h-[90vh] overflow-y-auto"
      >
        <SheetHeader className="pb-4">
          <SheetTitle 
            className="text-lg text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {task ? 'Editar Tarefa' : 'Nova Tarefa'}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-[#9AA0A6] text-xs">Título *</Label>
            <OlimpoInput
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="O que precisa ser feito?"
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

          <div className="p-3 bg-[#070A08] rounded-lg border border-[rgba(0,255,102,0.18)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-[#00FF66]" />
                <span className="text-sm text-[#E8E8E8]">Tarefa Recorrente</span>
              </div>
              <Switch
                checked={formData.isRecurring}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, isRecurring: v }))}
                className="data-[state=checked]:bg-[#00FF66]"
              />
            </div>

            {formData.isRecurring && (
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    className={`w-9 h-9 rounded-lg text-xs font-medium transition-all ${
                      formData.recurringDays.includes(day.value)
                        ? 'bg-[#00FF66] text-black'
                        : 'bg-[#0B0F0C] text-[#9AA0A6] border border-[rgba(0,255,102,0.18)]'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            )}
          </div>

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
                <SelectItem value="easy" className="text-[#E8E8E8]">Fácil (5 XP base)</SelectItem>
                <SelectItem value="medium" className="text-[#E8E8E8]">Médio (10 XP base)</SelectItem>
                <SelectItem value="hard" className="text-[#E8E8E8]">Difícil (15 XP base)</SelectItem>
                <SelectItem value="epic" className="text-[#E8E8E8]">Épico (25 XP base)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#9AA0A6] text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Horário (opcional)</Label>
              <OlimpoInput
                type="time"
                value={formData.timeOfDay}
                onChange={(e) => setFormData(prev => ({ ...prev, timeOfDay: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[#9AA0A6] text-xs">Prazo</Label>
              <OlimpoInput
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#9AA0A6] text-xs">Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}
              >
                <SelectTrigger className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
                  <SelectItem value="low" className="text-[#00FF66]">Baixa</SelectItem>
                  <SelectItem value="medium" className="text-[#FFC107]">Média</SelectItem>
                  <SelectItem value="high" className="text-[#FF3B3B]">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#9AA0A6] text-xs">Meta (opcional)</Label>
              <Select
                value={formData.goalId || '_none'}
                onValueChange={(v) => setFormData(prev => ({ ...prev, goalId: v === '_none' ? null : v }))}
              >
                <SelectTrigger className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
                  <SelectItem value="_none" className="text-[#9AA0A6]">Nenhuma</SelectItem>
                  {activeGoals.map(goal => (
                    <SelectItem key={goal.id} value={goal.id} className="text-[#E8E8E8]">
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[#9AA0A6] text-xs">Projeto (opcional)</Label>
              <Select
                value={formData.projectId || '_none'}
                onValueChange={(v) => setFormData(prev => ({ ...prev, projectId: v === '_none' ? null : v }))}
              >
                <SelectTrigger className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
                  <SelectItem value="_none" className="text-[#9AA0A6]">Nenhum</SelectItem>
                  {activeProjects.map(project => (
                    <SelectItem key={project.id} value={project.id} className="text-[#E8E8E8]">
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <OlimpoButton
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </OlimpoButton>
            <OlimpoButton
              type="submit"
              className="flex-1"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Salvando...' : task ? 'Atualizar' : 'Criar Tarefa'}
            </OlimpoButton>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}