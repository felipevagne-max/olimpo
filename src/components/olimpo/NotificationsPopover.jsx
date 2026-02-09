import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Check } from 'lucide-react';
import { format } from 'date-fns';
import OlimpoButton from './OlimpoButton';

export default function NotificationsPopover() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['userNotifications'],
    queryFn: () => base44.entities.UserNotification.list('-created_date')
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.UserNotification.update(id, {
      read_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['userNotifications']);
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read_at);
      await Promise.all(unread.map(n => 
        base44.entities.UserNotification.update(n.id, { read_at: new Date().toISOString() })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userNotifications']);
    }
  });

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="p-2 rounded-lg text-[#00FF66] hover:bg-[rgba(0,255,102,0.1)] transition-all relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <div 
              className="absolute top-1 right-1 w-4 h-4 bg-[#FF3B3B] text-white rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 bg-[#0B0F0C] border-[rgba(0,255,102,0.18)] p-0"
        align="end"
      >
        <div className="p-4 border-b border-[rgba(0,255,102,0.18)] flex items-center justify-between">
          <h3 
            className="text-sm font-semibold text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            NOTIFICAÇÕES
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              className="text-xs text-[#9AA0A6] hover:text-[#00FF66] transition-colors"
            >
              Marcar todas lidas
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-8 h-8 text-[#9AA0A6] mx-auto mb-2 opacity-50" />
              <p className="text-sm text-[#9AA0A6]">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(0,255,102,0.1)]">
              {notifications.map(notif => (
                <div 
                  key={notif.id}
                  className={`p-4 hover:bg-[rgba(0,255,102,0.05)] transition-colors ${
                    !notif.read_at ? 'bg-[rgba(0,255,102,0.03)]' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-[#E8E8E8]">
                          {notif.title}
                        </h4>
                        {!notif.read_at && (
                          <div className="w-2 h-2 rounded-full bg-[#00FF66]" />
                        )}
                      </div>
                      <p className="text-xs text-[#9AA0A6] mb-2">{notif.body}</p>
                      <p className="text-[10px] text-[#9AA0A6]">
                        {format(new Date(notif.created_date), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                    {!notif.read_at && (
                      <button
                        onClick={() => markReadMutation.mutate(notif.id)}
                        className="p-1 rounded hover:bg-[rgba(0,255,102,0.1)] transition-colors"
                      >
                        <Check className="w-4 h-4 text-[#00FF66]" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}