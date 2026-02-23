import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import OlimpoInput from '../olimpo/OlimpoInput';
import OlimpoButton from '../olimpo/OlimpoButton';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function InsightEditor({ open, onClose, note }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
    } else {
      setTitle('');
      setContent('');
    }
  }, [note, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const autoTitle = title.trim() || `Faísca • ${format(now, 'dd/MM • HH:mm', { locale: ptBR })}`;
      
      if (!content.trim()) {
        throw new Error('Conteúdo é obrigatório');
      }

      const data = {
        type: 'INSIGHT',
        title: autoTitle,
        content: content.trim()
      };

      if (note?.id) {
        return base44.entities.Note.update(note.id, data);
      } else {
        return base44.entities.Note.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Pronto.');
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao salvar');
    }
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom"
        className="bg-[#0B0F0C] border-t-[rgba(0,255,102,0.18)] h-[90vh]"
      >
        <SheetHeader className="mb-4">
          <SheetTitle 
            className="text-[#00FFFF]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {note ? 'Editar Faísca' : 'Nova Faísca'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-20">
          <div>
            <label className="text-xs text-[#9AA0A6] mb-1 block">
              Título (opcional)
            </label>
            <OlimpoInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Se vazio, gera automaticamente"
            />
          </div>

          <div>
            <label className="text-xs text-[#9AA0A6] mb-1 block">
              Conteúdo *
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva sua ideia aqui…"
              className="min-h-[300px] bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8] resize-none"
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-4">
            <OlimpoButton
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </OlimpoButton>
            <OlimpoButton
              onClick={handleSave}
              disabled={saveMutation.isPending || !content.trim()}
              className="flex-1"
            >
              Salvar
            </OlimpoButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}