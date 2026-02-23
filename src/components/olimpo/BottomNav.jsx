import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { LayoutDashboard, CheckSquare, Calendar, Target, Swords, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  { name: 'Hábitos', page: 'Habits', icon: CheckSquare },
  { name: 'Execução ON', page: 'Tasks', icon: Calendar },
  { name: 'Metas', page: 'Goals', icon: Target },
  { name: 'Comunidade', page: 'Community', icon: Swords },
  { name: 'Finanças', page: 'Finance', icon: Wallet },
];

export default function BottomNav({ collapsed = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const user = (() => { try { return JSON.parse(localStorage.getItem('olimpo_session') || 'null'); } catch { return null; } })();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-[#070A08] border-t border-[rgba(0,255,102,0.18)] z-50 lg:left-0 lg:top-0 lg:bottom-0 lg:border-r lg:border-t-0 lg:transition-all lg:duration-200 safe-area-inset"
      style={{
        width: window.innerWidth >= 1024 ? (collapsed ? '72px' : '256px') : '100%',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className={`flex justify-around items-center h-16 w-full px-1 lg:flex-col lg:h-auto lg:max-w-none lg:pt-20 lg:gap-1 ${collapsed ? 'lg:px-1' : 'lg:px-2'}`}>
        {navItems.map((item) => {
          const isActive = currentPath.includes(item.page);
          const Icon = item.icon;

          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-0.5 flex-1 min-w-0 rounded-lg transition-all duration-150 relative",
                collapsed 
                  ? "lg:flex-col lg:justify-center lg:w-full lg:px-1 lg:py-3 lg:gap-0.5"
                  : "lg:flex-row lg:justify-start lg:w-full lg:px-4 lg:py-3 lg:gap-3",
                isActive 
                  ? "text-[#00FF66]" 
                  : "text-[#9AA0A6] hover:text-[#00FF66] hover:bg-[rgba(0,255,102,0.05)]"
              )}
              title={collapsed ? item.name : undefined}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-all duration-150",
                isActive && "bg-[rgba(0,255,102,0.15)]"
              )}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
              </div>
              <span className={cn(
                "text-[9px] mt-0.5 font-medium truncate max-w-full",
                collapsed ? "lg:hidden" : "lg:text-sm lg:mt-0",
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