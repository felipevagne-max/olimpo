import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import OlimpoInput from '../olimpo/OlimpoInput';
import OlimpoButton from '../olimpo/OlimpoButton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Plus, X, Check } from 'lucide-react';

export default function MeetingEditor({ open, onClose, note }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [datetime, setDatetime] = useState('');
  const [participants, setParticipants] = useState('');
  const [agenda, setAgenda] = useState('');
  const [decisions, setDecisions] = useState('');
  const [nextSteps, setNextSteps] = useState([]);
  const [newStep, setNewStep] = useState('');

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      const meta = note.metadata || {};
      setDatetime(meta.datetime || '');
      setParticipants(meta.participants || '');
      setAgenda(meta.agenda || '');
      setDecisions(meta.decisions || '');
      setNextSteps(meta.next_steps || []);
    } else {
      setTitle('');
      const now = new Date();
      setDatetime(format(now, "yyyy-MM-dd'T'HH:mm"));
      setParticipants('');
      setAgenda('');
      setDecisions('');
      setNextSteps([]);
    }
  }, [note, open]);

  const addStep = () => {
    if (newStep.trim()) {
      setNextSteps([...nextSteps, { text: newStep.trim(), done: false }]);
      setNewStep('');
    }
  };

  const toggleStep = (index) => {
    setNextSteps(nextSteps.map((step, i) => 
      i === index ? { ...step, done: !step.done } : step
    ));
  };

  const removeStep = (index) => {
    setNextSteps(nextSteps.filter((_, i) => i !== index));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) {
        throw new Error('Título é obrigatório');
      }

      const content = `
${participants ? `Participantes: ${participants}` : ''}
${agenda ? `\nPauta:\n${agenda}` : ''}
${decisions ? `\nDecisões:\n${decisions}` : ''}
${nextSteps.length > 0 ? `\nPróximos passos:\n${nextSteps.map(s => `${s.done ? '✓' : '☐'} ${s.text}`).join('\n')}` : ''}
      `.trim();

      const data = {
        type: 'MEETING',
        title: title.trim(),
        content,
        metadata: {
          datetime,
          participants,
          agenda,
          decisions,
          next_steps: nextSteps
        }
      };

      if (note?.id) {
        return base44.entities.Note.update(note.id, data);
      } else {
        return base44.entities.Note.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notes']);
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
        className="bg-[#0B0F0C] border-t-[rgba(0,255,102,0.18)] h-[90vh] overflow-y-auto"
      >
        <SheetHeader className="mb-4">
          <SheetTitle 
            className="text-[#8B5CF6]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {note ? 'Editar Reunião' : 'Nova Ata de Reunião'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-20">
          <div>
            <label className="text-xs text-[#9AA0A6] mb-1 block">
              Título *
            </label>
            <OlimpoInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Reunião com… / Tema…"
            />
          </div>

          <div>
            <label className="text-xs text-[#9AA0A6] mb-1 block">
              Data e hora
            </label>
            <Input
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]"
            />
          </div>

          <div>
            <label className="text-xs text-[#9AA0A6] mb-1 block">
              Participantes
            </label>
            <OlimpoInput
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="Fulano, Ciclano…"
            />
          </div>

          <div>
            <label className="text-xs text-[#9AA0A6] mb-1 block">
              Pauta
            </label>
            <Textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="Tópicos discutidos…"
              className="min-h-[100px] bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]"
            />
          </div>

          <div>
            <label className="text-xs text-[#9AA0A6] mb-1 block">
              Decisões
            </label>
            <Textarea
              value={decisions}
              onChange={(e) => setDecisions(e.target.value)}
              placeholder="O que foi decidido…"
              className="min-h-[100px] bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]"
            />
          </div>

          <div>
            <label className="text-xs text-[#9AA0A6] mb-2 block">
              Próximos passos
            </label>
            <div className="space-y-2 mb-3">
              {nextSteps.map((step, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 p-2 bg-[#070A08] rounded-lg border border-[rgba(0,255,102,0.18)]"
                >
                  <button
                    onClick={() => toggleStep(index)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      step.done 
                        ? 'bg-[#00FF66] border-[#00FF66]' 
                        : 'border-[#9AA0A6]'
                    }`}
                  >
                    {step.done && <Check className="w-3 h-3 text-black" />}
                  </button>
                  <span className={`flex-1 text-sm ${step.done ? 'text-[#9AA0A6] line-through' : 'text-[#E8E8E8]'}`}>
                    {step.text}
                  </span>
                  <button
                    onClick={() => removeStep(index)}
                    className="text-[#9AA0A6] hover:text-[#FF3B3B]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addStep()}
                placeholder="Adicionar passo…"
                className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]"
              />
              <OlimpoButton
                onClick={addStep}
                disabled={!newStep.trim()}
                className="px-3"
              >
                <Plus className="w-4 h-4" />
              </OlimpoButton>
            </div>
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
              disabled={saveMutation.isPending || !title.trim()}
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