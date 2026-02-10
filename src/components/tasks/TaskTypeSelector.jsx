import { Zap, ListChecks } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function TaskTypeSelector({ open, onClose, onSelectQuick, onSelectFull }) {
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
            Criar Tarefa
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3">
          <button
            onClick={() => { onSelectQuick(); onClose(); }}
            className="w-full p-4 bg-[#070A08] border border-[rgba(0,255,102,0.18)] rounded-xl hover:bg-[rgba(0,255,102,0.05)] transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(0,255,102,0.15)] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#00FF66]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#E8E8E8]">Tarefa Rápida</p>
                <p className="text-xs text-[#9AA0A6]">Só título e descrição</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => { onSelectFull(); onClose(); }}
            className="w-full p-4 bg-[#070A08] border border-[rgba(0,255,102,0.18)] rounded-xl hover:bg-[rgba(0,255,102,0.05)] transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(0,255,102,0.15)] flex items-center justify-center">
                <ListChecks className="w-5 h-5 text-[#00FF66]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#E8E8E8]">Tarefa</p>
                <p className="text-xs text-[#9AA0A6]">Com prazo, prioridade, etc</p>
              </div>
            </div>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}