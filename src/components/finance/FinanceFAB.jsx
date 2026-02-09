import { useState } from 'react';
import { Plus, CreditCard, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FinanceFAB({ onAction }) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { id: 'receita', label: 'Nova receita', icon: TrendingUp, color: '#00FF66' },
    { id: 'despesa', label: 'Nova despesa', icon: DollarSign, color: '#FF3B3B' },
    { id: 'investimento', label: 'Investimento', icon: TrendingDown, color: '#7C5CFF' },
    { id: 'cartao', label: 'Compra no cartão', icon: CreditCard, color: '#FFC107' }
  ];

  const handleAction = (id) => {
    setIsOpen(false);
    onAction(id);
  };

  return (
    <div className="fixed bottom-24 right-4 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col gap-3 mb-3"
          >
            {actions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleAction(action.id)}
                  className="flex items-center gap-3 bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)] rounded-full py-3 px-4 hover:scale-105 transition-transform shadow-lg"
                >
                  <span className="text-xs text-[#E8E8E8] font-medium whitespace-nowrap">
                    {action.label}
                  </span>
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${action.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: action.color }} />
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-[#00FF66] flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        style={{ filter: 'drop-shadow(0 0 20px rgba(0,255,102,0.4))' }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="w-7 h-7 text-black" strokeWidth={3} />
        </motion.div>
      </button>
    </div>
  );
}