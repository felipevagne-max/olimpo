import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import OlimpoButton from '../olimpo/OlimpoButton';
import { Calendar, CheckSquare } from 'lucide-react';

export default function GoalActionSheet({ open, onClose, goalId }) {
  const navigate = useNavigate();

  const handleCreateTask = () => {
    navigate(createPageUrl('Tasks') + `?goalId=${goalId}`);
    onClose();
  };

  const handleCreateHabit = () => {
    navigate(createPageUrl('CreateHabit') + `?goalId=${goalId}`);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="bg-[#0B0F0C] border-t border-[rgba(0,255,102,0.18)] rounded-t-2xl"
      >
        <SheetHeader className="pb-4">
          <SheetTitle 
            className="text-lg text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Criar Ação
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3">
          <OlimpoButton 
            className="w-full flex items-center justify-center gap-3"
            onClick={handleCreateTask}
          >
            <Calendar className="w-5 h-5" />
            <span>Criar Tarefa</span>
          </OlimpoButton>

          <OlimpoButton 
            variant="secondary"
            className="w-full flex items-center justify-center gap-3"
            onClick={handleCreateHabit}
          >
            <CheckSquare className="w-5 h-5" />
            <span>Criar Hábito</span>
          </OlimpoButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}