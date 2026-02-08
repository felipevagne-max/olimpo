import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Lock } from 'lucide-react';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import { toast } from 'sonner';

export default function Titles() {
  const navigate = useNavigate();
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
        // Seed default titles
        const defaults = [
          { name: 'Iniciante', description: 'Primeiros passos', unlockedByDefault: true, iconName: 'Award' },
          { name: 'Guerreiro', description: 'Supere desafios', unlockedByDefault: true, iconName: 'Sword' },
          { name: 'Conquistador', description: 'Complete metas épicas', unlockedByDefault: false, iconName: 'Trophy' },
          { name: 'Lendário', description: 'Status de elite', unlockedByDefault: false, iconName: 'Crown' },
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
    mutationFn: async ({ titleId, slot }) => {
      if (!userTitles?.id) return;
      
      const update = {};
      update[`equippedTitle${slot}`] = titleId;
      
      return base44.entities.UserTitles.update(userTitles.id, update);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userTitles']);
      toast.success('Título equipado');
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

  const getTitleName = (titleId) => {
    if (!titleId) return null;
    const title = titleDefinitions.find(t => t.id === titleId);
    return title?.name || 'Desconhecido';
  };

  const isEquipped = (titleId) => equipped.includes(titleId);

  const getNextAvailableSlot = () => {
    if (!userTitles?.equippedTitle1) return 1;
    if (!userTitles?.equippedTitle2) return 2;
    if (!userTitles?.equippedTitle3) return 3;
    return null;
  };

  if (!userTitles || titleDefinitions.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-8">
      <div className="px-4 pt-6">
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 text-[#9AA0A6] hover:text-[#00FF66]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 
            className="text-xl font-bold text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            TÍTULOS
          </h1>
        </div>
        <p className="text-[#9AA0A6] text-sm mb-6 ml-11">Equipe até 3 títulos.</p>

        {/* Equipped Slots */}
        <OlimpoCard className="mb-6">
          <h3 className="text-sm font-semibold text-[#E8E8E8] mb-4">Títulos Equipados</h3>
          <div className="space-y-3">
            {[1, 2, 3].map((slot) => {
              const titleId = userTitles[`equippedTitle${slot}`];
              const titleName = getTitleName(titleId);
              
              return (
                <div 
                  key={slot}
                  className="flex items-center justify-between p-3 bg-[#070A08] rounded-lg border border-[rgba(0,255,102,0.1)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[rgba(0,255,102,0.1)] flex items-center justify-center">
                      <span className="text-xs text-[#00FF66] font-bold">{slot}</span>
                    </div>
                    <div>
                      <p className="text-sm text-[#E8E8E8]">
                        {titleName || 'Vazio'}
                      </p>
                      <p className="text-xs text-[#9AA0A6]">Slot {slot}</p>
                    </div>
                  </div>
                  {titleId && (
                    <OlimpoButton
                      variant="ghost"
                      className="h-8 px-3"
                      onClick={() => unequipMutation.mutate(slot)}
                    >
                      Remover
                    </OlimpoButton>
                  )}
                </div>
              );
            })}
          </div>
        </OlimpoCard>

        {/* Available Titles */}
        <h3 className="text-sm font-semibold text-[#E8E8E8] mb-3">Títulos Disponíveis</h3>
        <div className="space-y-2">
          {titleDefinitions.map((title) => {
            const unlocked = title.unlockedByDefault;
            const equipped = isEquipped(title.id);
            const canEquip = unlocked && !equipped && getNextAvailableSlot();

            return (
              <OlimpoCard key={title.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      unlocked ? 'bg-[rgba(0,255,102,0.1)]' : 'bg-[rgba(255,255,255,0.05)]'
                    }`}>
                      {unlocked ? (
                        <Award className="w-5 h-5 text-[#00FF66]" />
                      ) : (
                        <Lock className="w-5 h-5 text-[#9AA0A6]" />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${unlocked ? 'text-[#E8E8E8]' : 'text-[#9AA0A6]'}`}>
                        {title.name}
                      </p>
                      <p className="text-xs text-[#9AA0A6]">{title.description}</p>
                    </div>
                  </div>
                  
                  {equipped ? (
                    <span className="text-xs text-[#00FF66] px-3 py-1 rounded-full bg-[rgba(0,255,102,0.1)]">
                      Equipado
                    </span>
                  ) : canEquip ? (
                    <OlimpoButton
                      variant="secondary"
                      className="h-8 px-3"
                      onClick={() => equipMutation.mutate({ titleId: title.id, slot: getNextAvailableSlot() })}
                    >
                      Equipar
                    </OlimpoButton>
                  ) : !unlocked ? (
                    <span className="text-xs text-[#9AA0A6]">Bloqueado</span>
                  ) : null}
                </div>
              </OlimpoCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}