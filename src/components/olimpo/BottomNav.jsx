import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { LayoutDashboard, CheckSquare, Calendar, Target, Swords, Wallet, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  { name: 'Hábitos', page: 'Habits', icon: CheckSquare },
  { name: 'Execução ON', page: 'Tasks', icon: Calendar },
  { name: 'Oráculo', page: 'Oracle', icon: Eye },
  { name: 'Metas', page: 'Goals', icon: Target },
  { name: 'Comunidade', page: 'Community', icon: Swords },
  { name: 'Finanças', page: 'Finance', icon: Wallet },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const { data: insights = [] } = useQuery({
    queryKey: ['oracleInsights'],
    queryFn: () => base44.entities.OracleInsight.list()
  });

  const unreadCount = insights.filter(i => !i.read).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#070A08] border-t border-[rgba(0,255,102,0.18)] z-50 lg:left-0 lg:top-0 lg:bottom-0 lg:w-64 lg:border-r lg:border-t-0">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-1 lg:flex-col lg:h-auto lg:max-w-none lg:pt-20 lg:gap-1 lg:px-2">
        {navItems.map((item) => {
          const isActive = currentPath.includes(item.page);
          const Icon = item.icon;
          const isOracle = item.page === 'Oracle';

          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-0.5 flex-1 min-w-0 rounded-lg transition-all duration-150 relative",
                "lg:flex-row lg:justify-start lg:w-full lg:px-4 lg:py-3 lg:gap-3",
                isOracle 
                  ? "text-[#00FF66]"
                  : isActive 
                    ? "text-[#00FF66]" 
                    : "text-[#9AA0A6] hover:text-[#00FF66] hover:bg-[rgba(0,255,102,0.05)]"
              )}
              style={isOracle ? { filter: 'drop-shadow(0 0 4px rgba(0,255,102,0.3))' } : undefined}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-all duration-150",
                isOracle ? "bg-[rgba(0,255,102,0.15)]" : isActive && "bg-[rgba(0,255,102,0.15)]"
              )}>
                <Icon className="w-5 h-5" strokeWidth={isOracle || isActive ? 2 : 1.5} />
              </div>
              {isOracle && unreadCount > 0 && (
                <div 
                  className="absolute top-1 right-1/2 translate-x-3 w-4 h-4 bg-[#00FF66] text-black rounded-full flex items-center justify-center text-[8px] font-bold lg:static lg:translate-x-0 lg:ml-auto"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {unreadCount}
                </div>
              )}
              <span className={cn(
                "text-[9px] mt-0.5 font-medium truncate max-w-full lg:text-sm lg:mt-0",
                isActive ? "text-[#00FF66]" : "text-[#9AA0A6]"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}