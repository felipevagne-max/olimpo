import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Lock, Award, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { TITLE_COLORS, TITLE_SYMBOLS } from './TitleSymbols';

export default function TitlePopover({ children }) {
  const queryClient = useQueryClient();

  const { data: userTitles } = useQuery({
    queryKey: ['userTitles'],
    queryFn: async () => {
      const titles = await base44.entities.UserTitles.list();
      if (titles.length === 0) {
        return await base44.entities.UserTitles.create({
          equippedTitle1: null,
          equippedTitle2: null,
          equippedTitle3: null
        });
      }
      return titles[0];
    }
  });

  const { data: titleDefinitions = [] } = useQuery({
    queryKey: ['titleDefinitions'],
    queryFn: async () => {
      const defs = await base44.entities.TitleDefinition.list();
      if (defs.length === 0) {
        const defaults = [
          { name: 'Vigilante do Código', description: 'Observador atento', unlockedByDefault: true },
          { name: 'Forjador de Rotina', description: 'Construtor de hábitos', unlockedByDefault: true },
          { name: 'Executor Implacável', description: 'Conclusão garantida', unlockedByDefault: true },
          { name: 'Arquiteto do Amanhã', description: 'Planejador estratégico', unlockedByDefault: true },
          { name: 'Disciplina de Aço', description: 'Força inabalável', unlockedByDefault: false },
          { name: 'Tempestade Controlada', description: 'Poder dominado', unlockedByDefault: false },
          { name: 'Coração Calmo', description: 'Serenidade absoluta', unlockedByDefault: false },
          { name: 'Mente Estratégica', description: 'Pensamento superior', unlockedByDefault: false },
        ];
        
        for (const def of defaults) {
          await base44.entities.TitleDefinition.create(def);
        }
        
        return await base44.entities.TitleDefinition.list();
      }
      return defs;
    }
  });

  const equipMutation = useMutation({
    mutationFn: async ({ titleId, slot, title }) => {
      if (!userTitles?.id) return;
      const update = {};
      update[`equippedTitle${slot}`] = titleId;
      await base44.entities.UserTitles.update(userTitles.id, update);
      return title;
    },
    onSuccess: (title) => {
      queryClient.invalidateQueries(['userTitles']);
      
      // Epic animation and sound
      const color = TITLE_COLORS[title.name] || '#00FF66';
      const event = new CustomEvent('title-equipped', { 
        detail: { color, titleName: title.name } 
      });
      window.dispatchEvent(event);
      
      toast.success(`✨ ${title.name} equipado!`);
    }
  });

  const unequipMutation = useMutation({
    mutationFn: async (slot) => {
      if (!userTitles?.id) return;
      const update = {};
      update[`equippedTitle${slot}`] = null;
      return base44.entities.UserTitles.update(userTitles.id, update);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userTitles']);
      toast.success('Título removido');
    }
  });

  const equipped = [
    userTitles?.equippedTitle1,
    userTitles?.equippedTitle2,
    userTitles?.equippedTitle3
  ];

  const getTitleById = (id) => titleDefinitions.find(t => t.id === id);
  const isEquipped = (titleId) => equipped.includes(titleId);
  const getNextSlot = () => {
    if (!userTitles?.equippedTitle1) return 1;
    if (!userTitles?.equippedTitle2) return 2;
    if (!userTitles?.equippedTitle3) return 3;
    return null;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)] text-[#E8E8E8] w-80"
        align="end"
      >
        <div className="space-y-4">
          <div>
            <h3 
              className="text-sm font-bold text-[#00FF66] mb-1"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              TÍTULOS
            </h3>
            <p className="text-xs text-[#9AA0A6]">Equipe até 3</p>
          </div>

          {/* Equipped Shields */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((slot) => {
              const titleId = userTitles?.[`equippedTitle${slot}`];
              const title = getTitleById(titleId);
              const color = title ? TITLE_COLORS[title.name] || '#00FF66' : 'transparent';

              return (
                <button
                  key={slot}
                  onClick={() => titleId && unequipMutation.mutate(slot)}
                  className="relative aspect-square rounded-lg border-2 transition-all hover:scale-105"
                  style={{
                    borderColor: titleId ? color : 'rgba(0,255,102,0.18)',
                    backgroundColor: titleId ? `${color}15` : 'rgba(0,0,0,0.3)'
                  }}
                >
                  {title ? (
                    <>
                      <div className="w-full h-full p-2" style={{ color }}>
                        {TITLE_SYMBOLS[title.name] || <Shield className="w-full h-full" />}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1">
                        <p className="text-[8px] text-center truncate" style={{ color }}>
                          {title.name.split(' ')[0]}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-xs text-[#9AA0A6]">Vazio</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Available Titles */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            <p className="text-xs text-[#9AA0A6] mb-2">Disponíveis</p>
            {titleDefinitions.map((title) => {
              const unlocked = title.unlockedByDefault;
              const equipped = isEquipped(title.id);
              const canEquip = unlocked && !equipped && getNextSlot();
              const color = TITLE_COLORS[title.name] || '#00FF66';

              return (
                <div
                  key={title.id}
                  className="flex items-center gap-2 p-2 rounded-lg border transition-all"
                  style={{
                    borderColor: unlocked ? `${color}40` : 'rgba(255,255,255,0.05)',
                    backgroundColor: unlocked ? `${color}08` : 'rgba(0,0,0,0.3)'
                  }}
                >
                  <div 
                    className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: unlocked ? `${color}20` : 'rgba(255,255,255,0.05)', color }}
                  >
                    {unlocked ? (
                      TITLE_SYMBOLS[title.name] || <Award className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4 text-[#9AA0A6]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${unlocked ? 'text-[#E8E8E8]' : 'text-[#9AA0A6]'}`}>
                      {title.name}
                    </p>
                    <p className="text-[10px] text-[#9AA0A6] truncate">{title.description}</p>
                  </div>
                  {equipped ? (
                    <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>
                      Equipado
                    </span>
                  ) : canEquip ? (
                    <button
                      onClick={() => equipMutation.mutate({ titleId: title.id, slot: getNextSlot(), title })}
                      className="text-[9px] px-2 py-1 rounded border transition-all hover:bg-[rgba(0,255,102,0.1)]"
                      style={{ borderColor: `${color}40`, color }}
                    >
                      Equipar
                    </button>
                  ) : !unlocked ? (
                    <Lock className="w-3 h-3 text-[#9AA0A6]" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}