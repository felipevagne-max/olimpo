import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, CheckSquare, Calendar, Target, Swords, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  { name: 'Hábitos', page: 'Habits', icon: CheckSquare },
  { name: 'Tarefas', page: 'Tasks', icon: Calendar },
  { name: 'Metas', page: 'Goals', icon: Target },
  { name: 'Comunidade', page: 'Community', icon: Swords },
  { name: 'Finanças', page: 'Finance', icon: Wallet },
];

export default function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#070A08] border-t border-[rgba(0,255,102,0.18)] z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = currentPath.includes(item.page);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 min-w-[50px] rounded-lg transition-all duration-150",
                isActive 
                  ? "text-[#00FF66]" 
                  : "text-[#9AA0A6] hover:text-[#00FF66]"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-all duration-150",
                isActive && "bg-[rgba(0,255,102,0.15)]"
              )}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
              </div>
              <span className={cn(
                "text-[10px] mt-0.5 font-medium",
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