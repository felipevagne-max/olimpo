import { DollarSign, TrendingDown, TrendingUp, CreditCard } from 'lucide-react';

const ACTIONS = [
  {
    id: 'income',
    label: 'Nova Receita',
    icon: TrendingUp,
    color: '#00FF66',
    bgColor: 'rgba(0,255,102,0.1)',
    borderColor: 'rgba(0,255,102,0.3)'
  },
  {
    id: 'expense',
    label: 'Nova Despesa',
    icon: TrendingDown,
    color: '#FFC107',
    bgColor: 'rgba(255,193,7,0.1)',
    borderColor: 'rgba(255,193,7,0.3)'
  },
  {
    id: 'investment',
    label: 'Investimento',
    icon: DollarSign,
    color: '#A855F7',
    bgColor: 'rgba(168,85,247,0.1)',
    borderColor: 'rgba(168,85,247,0.3)'
  },
  {
    id: 'card',
    label: 'Compra no Cartão',
    icon: CreditCard,
    color: '#3B82F6',
    bgColor: 'rgba(59,130,246,0.1)',
    borderColor: 'rgba(59,130,246,0.3)'
  }
];

export default function DesktopFinanceActions({ onAction }) {
  return (
    <div className="hidden lg:grid lg:grid-cols-4 gap-3 mb-6">
      {ACTIONS.map(action => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className="p-4 rounded-xl transition-all hover:scale-105"
            style={{
              backgroundColor: action.bgColor,
              borderLeft: `3px solid ${action.color}`,
              border: `1px solid ${action.borderColor}`
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: action.bgColor }}
              >
                <Icon className="w-5 h-5" style={{ color: action.color }} />
              </div>
              <span 
                className="text-sm font-semibold"
                style={{ color: action.color, fontFamily: 'Orbitron, sans-serif' }}
              >
                {action.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}