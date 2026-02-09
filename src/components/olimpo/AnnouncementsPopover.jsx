import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import OlimpoButton from './OlimpoButton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AnnouncementsPopover() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.list('-created_date')
  });

  const { data: reads = [] } = useQuery({
    queryKey: ['announcementReads'],
    queryFn: () => base44.entities.AnnouncementRead.list()
  });

  const unreadCount = announcements.filter(a => 
    !reads.some(r => r.announcement_id === a.id)
  ).length;

  const markAsReadMutation = useMutation({
    mutationFn: (announcementId) => {
      return base44.entities.AnnouncementRead.create({
        announcement_id: announcementId,
        read_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['announcementReads']);
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = announcements.filter(a => 
        !reads.some(r => r.announcement_id === a.id)
      );
      for (const announcement of unread) {
        await base44.entities.AnnouncementRead.create({
          announcement_id: announcement.id,
          read_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['announcementReads']);
    }
  });

  const isRead = (announcementId) => reads.some(r => r.announcement_id === announcementId);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button 
          className="relative p-2 text-[#9AA0A6] hover:text-[#00FF66] transition-colors rounded-lg hover:bg-[rgba(0,255,102,0.1)]"
          title="Recados"
        >
          <Mail className="w-5 h-5" />
          {unreadCount > 0 && (
            <div 
              className="absolute -top-1 -right-1 w-5 h-5 bg-[#00FF66] text-black rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {unreadCount}
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 bg-[#0B0F0C] border-[rgba(0,255,102,0.18)] p-0 max-h-[400px] overflow-y-auto"
        align="end"
      >
        <div className="p-4 border-b border-[rgba(0,255,102,0.18)] sticky top-0 bg-[#0B0F0C]">
          <div className="flex items-center justify-between">
            <h3 
              className="text-sm font-semibold text-[#00FF66]"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              RECADOS
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                className="text-xs text-[#9AA0A6] hover:text-[#00FF66]"
              >
                Marcar todos lidos
              </button>
            )}
          </div>
        </div>

        <div className="p-4">
          {announcements.length === 0 ? (
            <p className="text-sm text-[#9AA0A6] text-center py-4">
              Nenhum recado por enquanto
            </p>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement) => {
                const read = isRead(announcement.id);
                return (
                  <div
                    key={announcement.id}
                    onClick={() => !read && markAsReadMutation.mutate(announcement.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      read 
                        ? 'bg-[#070A08] border-[rgba(0,255,102,0.1)] opacity-60' 
                        : 'bg-[rgba(0,255,102,0.05)] border-[rgba(0,255,102,0.3)]'
                    }`}
                  >
                    {announcement.title && (
                      <h4 className="text-sm font-semibold text-[#E8E8E8] mb-1">
                        {announcement.title}
                      </h4>
                    )}
                    <p className="text-xs text-[#9AA0A6] line-clamp-3">
                      {announcement.body}
                    </p>
                    <p 
                      className="text-[10px] text-[#9AA0A6] mt-2"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {format(new Date(announcement.created_date), 'dd MMM, HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}