import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import OlimpoButton from '../olimpo/OlimpoButton';
import OlimpoCard from '../olimpo/OlimpoCard';
import LoadingSpinner from '../olimpo/LoadingSpinner';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, CheckCircle, Pencil, Trash2, Save, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectDetailSheet({ open, onClose, project, onEdit }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Task.filter({ created_by: user.email });
    },
    enabled: !!user?.email && open && !!project
  });

  const updateNotesMutation = useMutation({
    mutationFn: async (newNotes) => {
      return base44.entities.Project.update(project.id, { notes: newNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      toast.success('Notas atualizadas');
      setIsEditingNotes(false);
    }
  });

  const markAsClosedMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Project.update(project.id, { status: 'closed' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      toast.success('Projeto fechado! 🎉');
      onClose();
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Project.delete(project.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      toast.success('Projeto excluído');
      onClose();
    }
  });

  if (!project) return null;

  const projectTasks = tasks.filter(t => t.projectId === project.id && !t.archived);
  const completedTasks = projectTasks.filter(t => t.completed);
  const pendingTasks = projectTasks.filter(t => !t.completed);
  const progress = projectTasks.length > 0 ? (completedTasks.length / projectTasks.length) * 100 : 0;

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(notes);
  };

  const handleEditNotes = () => {
    setNotes(project.notes || '');
    setIsEditingNotes(true);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="bg-black border-t border-[rgba(0,255,102,0.18)] h-[90vh] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${project.color}22`, border: `2px solid ${project.color}` }}
              >
                <span className="text-2xl">📁</span>
              </div>
              <div>
                <SheetTitle 
                  className="text-xl font-bold text-[#E8E8E8]"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  {project.name}
                </SheetTitle>
              </div>
            </div>
            <button
              onClick={() => onEdit(project)}
              className="p-2 text-[#9AA0A6] hover:text-[#00FF66]"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        </SheetHeader>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-[#9AA0A6] mb-6">{project.description}</p>
        )}

        {/* Stats */}
        <OlimpoCard className="mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#9AA0A6]">Progresso</span>
              <span className="text-sm font-semibold text-[#00FF66]">
                {completedTasks.length}/{projectTasks.length} tarefas
              </span>
            </div>
            <div className="h-2 bg-[#070A08] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${progress}%`,
                  backgroundColor: project.color 
                }}
              />
            </div>
          </div>
        </OlimpoCard>

        {/* Notes Section */}
        <OlimpoCard className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-[#9AA0A6] text-sm">Notas do Projeto</Label>
            {!isEditingNotes && (
              <button
                onClick={handleEditNotes}
                className="text-xs text-[#00FF66] hover:text-[#00DD55]"
              >
                Editar
              </button>
            )}
          </div>
          {isEditingNotes ? (
            <div className="space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione anotações sobre o projeto..."
                className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8] placeholder:text-[#9AA0A6] focus:border-[#00FF66] resize-none min-h-[120px]"
              />
              <div className="flex gap-2">
                <OlimpoButton
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setIsEditingNotes(false)}
                >
                  Cancelar
                </OlimpoButton>
                <OlimpoButton
                  onClick={handleSaveNotes}
                  className="flex-1"
                  disabled={updateNotesMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </OlimpoButton>
              </div>
            </div>
          ) : (
            <div className="text-sm text-[#E8E8E8] whitespace-pre-wrap">
              {project.notes || (
                <span className="text-[#9AA0A6] italic">Nenhuma nota adicionada ainda</span>
              )}
            </div>
          )}
        </OlimpoCard>

        {/* Tasks List */}
        {isLoading ? (
          <LoadingSpinner size="lg" className="mt-8" />
        ) : (
          <div className="space-y-6">
            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#9AA0A6] mb-3 uppercase">
                  Tarefas Pendentes ({pendingTasks.length})
                </h3>
                <div className="space-y-2">
                  {pendingTasks.map(task => (
                    <OlimpoCard key={task.id}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-5 h-5 rounded border-2 border-[#9AA0A6]" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-[#E8E8E8]">{task.title}</h4>
                          {task.date && (
                            <span className="text-xs text-[#9AA0A6]">
                              {format(new Date(task.date), "dd/MM/yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                    </OlimpoCard>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#9AA0A6] mb-3 uppercase">
                  Tarefas Concluídas ({completedTasks.length})
                </h3>
                <div className="space-y-2">
                  {completedTasks.map(task => (
                    <OlimpoCard key={task.id} className="opacity-60">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-5 h-5 rounded bg-[#00FF66] border-2 border-[#00FF66] flex items-center justify-center">
                          <Check className="w-3 h-3 text-black" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-[#9AA0A6] line-through">{task.title}</h4>
                        </div>
                      </div>
                    </OlimpoCard>
                  ))}
                </div>
              </div>
            )}

            {projectTasks.length === 0 && (
              <p className="text-center text-[#9AA0A6] text-sm py-8">
                Nenhuma tarefa vinculada a este projeto ainda
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 space-y-3 pb-6">
          {project.status === 'active' && (
            <OlimpoButton
              className="w-full"
              onClick={() => markAsClosedMutation.mutate()}
              disabled={markAsClosedMutation.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Fechar Projeto
            </OlimpoButton>
          )}
          <OlimpoButton
            variant="secondary"
            className="w-full text-[#FF3B3B] border-[#FF3B3B] hover:bg-[rgba(255,59,59,0.1)]"
            onClick={() => {
              if (confirm('Tem certeza que deseja excluir este projeto? As tarefas não serão excluídas.')) {
                deleteProjectMutation.mutate();
              }
            }}
            disabled={deleteProjectMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir Projeto
          </OlimpoButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}