import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { LayoutDashboard, CheckSquare, Calendar, Target, Swords, Wallet, Eye } from 'lucide-react';
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
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const { data: insights = [] } = useQuery({
    queryKey: ['oracleInsights'],
    queryFn: () => base44.entities.OracleInsight.list()
  });

  const unreadCount = insights.filter(i => !i.read).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#070A08] border-t border-[rgba(0,255,102,0.18)] z-50">
      <div className="relative">
        {/* Floating Oracle Button - integrated into nav bar */}
        <button
          onClick={() => navigate(createPageUrl('Oracle'))}
          className="absolute left-1/2 -translate-x-1/2 -top-7 transition-all hover:scale-105"
        >
          <div className="relative">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center bg-[#0B0F0C] border-2 border-[#00FF66]"
              style={{ filter: 'drop-shadow(0 0 12px rgba(0,255,102,0.4))' }}
            >
              <Eye className="w-6 h-6 text-[#00FF66]" strokeWidth={2.5} />
            </div>
            {unreadCount > 0 && (
              <div 
                className="absolute -top-1 -right-1 w-5 h-5 bg-[#00FF66] text-black rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {unreadCount}
              </div>
            )}
          </div>
        </button>

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
            </div>
            </nav>
            );
            }