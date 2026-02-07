import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { LayoutDashboard, Calendar, Eye, TrendingUp, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  { name: 'Tarefas', page: 'Tasks', icon: Calendar },
  { name: 'Oráculo', page: 'Oracle', icon: Eye, isCenter: true },
  { name: 'Progresso', page: 'Progress', icon: TrendingUp },
  { name: 'Comunidade', page: 'Community', icon: Swords },
];

export default function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const { data: insights = [] } = useQuery({
    queryKey: ['oracleInsights'],
    queryFn: () => base44.entities.OracleInsight.list()
  });

  const unreadCount = insights.filter(i => !i.read).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#070A08] border-t border-[rgba(0,255,102,0.18)] z-50">
      <div className="flex justify-around items-end h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = currentPath.includes(item.page);
          const Icon = item.icon;
          const isCenter = item.isCenter;
          
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={cn(
                "flex flex-col items-center justify-center transition-all duration-150 relative",
                isCenter ? "mb-6" : "py-2 px-1 min-w-[50px] rounded-lg",
                isActive && !isCenter && "text-[#00FF66]",
                !isActive && !isCenter && "text-[#9AA0A6] hover:text-[#00FF66]"
              )}
            >
              {isCenter ? (
                <div className="relative">
                  <div 
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                      "bg-[#0B0F0C] border-2 border-[rgba(0,255,102,0.18)]",
                      isActive && "bg-[rgba(0,255,102,0.1)] border-[#00FF66]"
                    )}
                    style={{ 
                      filter: 'drop-shadow(0 0 12px rgba(0,255,102,0.3))',
                      transform: 'translateY(-8px)'
                    }}
                  >
                    <Icon 
                      className={cn("w-7 h-7", isActive ? "text-[#00FF66]" : "text-[#9AA0A6]")} 
                      strokeWidth={2}
                    />
                  </div>
                  {unreadCount > 0 && (
                    <div 
                      className="absolute -top-1 -right-1 w-5 h-5 bg-[#00FF66] text-black rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {unreadCount}
                    </div>
                  )}
                  <span className={cn(
                    "text-[10px] mt-1 font-medium block text-center",
                    isActive ? "text-[#00FF66]" : "text-[#9AA0A6]"
                  )}>
                    {item.name}
                  </span>
                </div>
              ) : (
                <>
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
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}