import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/components/olimpo/entityClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import OlimpoButton from '../olimpo/OlimpoButton';
import OlimpoInput from '../olimpo/OlimpoInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const PROJECT_COLORS = [
  '#00FF66', '#00FFC8', '#00DDFF', '#0088FF', 
  '#8844FF', '#FF00FF', '#FF0088', '#FF3B3B',
  '#FFC107', '#FFD400'
];

export default function CreateProjectModal({ open, onClose, project }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    notes: '',
    color: '#00FF66',
    status: 'active'
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        notes: project.notes || '',
        color: project.color || '#00FF66',
        status: project.status || 'active'
      });
    } else {
      setFormData({
        name: '',
        description: '',
        notes: '',
        color: '#00FF66',
        status: 'active'
      });
    }
  }, [project, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (project) {
        return base44.entities.Project.update(project.id, data);
      }
      return base44.entities.Project.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      toast.success(project ? 'Projeto atualizado' : 'Projeto criado');
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Digite um nome para o projeto');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)] max-w-md">
        <DialogHeader>
          <DialogTitle 
            className="text-xl font-bold text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {project ? 'EDITAR PROJETO' : 'NOVO PROJETO'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label className="text-[#9AA0A6] text-xs">Nome do Projeto *</Label>
            <OlimpoInput
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Lançamento do App"
              required
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detalhes do projeto..."
              className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8] placeholder:text-[#9AA0A6] focus:border-[#00FF66] resize-none"
              rows={2}
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs mb-2 block">Cor do Projeto</Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    formData.color === color ? 'ring-2 ring-white scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
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
              {saveMutation.isPending ? 'Salvando...' : project ? 'Salvar' : 'Criar'}
            </OlimpoButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}