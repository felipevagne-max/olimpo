import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '@/components/olimpo/TopBar';
import BottomNav from '@/components/olimpo/BottomNav';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import { Plus, Zap, Calendar as CalendarIcon, Search, Pin, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import InsightEditor from '@/components/notes/InsightEditor';
import MeetingEditor from '@/components/notes/MeetingEditor';

export default function Notes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showInsightEditor, setShowInsightEditor] = useState(false);
  const [showMeetingEditor, setShowMeetingEditor] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const allNotes = await base44.entities.Note.list();
      return allNotes.filter(n => !n.deleted_at);
    }
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    }
  });

  const togglePinMutation = useMutation({
    mutationFn: ({ id, pinned }) => base44.entities.Note.update(id, { pinned: !pinned }),
    onSuccess: () => queryClient.invalidateQueries(['notes'])
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Note.update(id, { deleted_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notes']);
      toast.success('Pronto.');
    }
  });

  const handleEdit = (note) => {
    setEditingNote(note);
    if (note.type === 'INSIGHT') {
      setShowInsightEditor(true);
    } else {
      setShowMeetingEditor(true);
    }
  };

  const handleNewNote = (type) => {
    setEditingNote(null);
    setShowTypeSelector(false);
    if (type === 'INSIGHT') {
      setShowInsightEditor(true);
    } else {
      setShowMeetingEditor(true);
    }
  };

  // Filter and search
  const filteredNotes = notes
    .filter(n => {
      if (typeFilter === 'INSIGHT') return n.type === 'INSIGHT';
      if (typeFilter === 'MEETING') return n.type === 'MEETING';
      return true;
    })
    .filter(n => {
      if (!searchQuery) return true;
      const search = searchQuery.toLowerCase();
      return (
        n.title?.toLowerCase().includes(search) ||
        n.content?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.created_date) - new Date(a.created_date);
    });

  const hasNotes = notes.length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      <TopBar />
      <div className="px-4 pt-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 
            className="text-xl font-bold text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            CADERNO
          </h1>
          <OlimpoButton onClick={() => setShowTypeSelector(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Nova
          </OlimpoButton>
        </div>
        <p className="text-[#9AA0A6] text-sm mb-6">
          Capture ideias e registre reuniões sem perder tempo.
        </p>

        {!hasNotes ? (
          // First time: show type selector
          <div className="space-y-4 mt-8">
            <OlimpoCard 
              className="cursor-pointer hover:bg-[rgba(0,255,102,0.05)] transition-all"
              onClick={() => handleNewNote('INSIGHT')}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[rgba(0,255,255,0.15)] flex items-center justify-center">
                  <Zap className="w-6 h-6 text-[#00FFFF]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#E8E8E8] mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Faísca
                  </h3>
                  <p className="text-sm text-[#9AA0A6]">
                    Anote uma ideia rápida pra não esquecer.
                  </p>
                </div>
              </div>
            </OlimpoCard>

            <OlimpoCard 
              className="cursor-pointer hover:bg-[rgba(0,255,102,0.05)] transition-all"
              onClick={() => handleNewNote('MEETING')}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[rgba(139,92,246,0.15)] flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-[#8B5CF6]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#E8E8E8] mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Ata de Reunião
                  </h3>
                  <p className="text-sm text-[#9AA0A6]">
                    Organize pauta, decisões e próximos passos.
                  </p>
                </div>
              </div>
            </OlimpoCard>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA0A6]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar notas…"
                className="pl-10 bg-[#0B0F0C] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9AA0A6] hover:text-[#00FF66]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {['ALL', 'INSIGHT', 'MEETING'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setTypeFilter(filter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    typeFilter === filter
                      ? 'bg-[#00FF66] text-black'
                      : 'bg-[#0B0F0C] text-[#9AA0A6] border border-[rgba(0,255,102,0.18)]'
                  }`}
                >
                  {filter === 'ALL' ? 'Todas' : filter === 'INSIGHT' ? 'Faíscas' : 'Reuniões'}
                </button>
              ))}
            </div>

            {/* Notes List */}
            <div className="space-y-3">
              {filteredNotes.map(note => (
                <OlimpoCard 
                  key={note.id}
                  className="cursor-pointer"
                  onClick={() => handleEdit(note)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {note.pinned && (
                          <Pin className="w-3 h-3 text-[#FFD400] flex-shrink-0" fill="currentColor" />
                        )}
                        <h3 className="font-medium text-[#E8E8E8] truncate">
                          {note.title || `${note.type === 'INSIGHT' ? 'Faísca' : 'Reunião'} • ${format(new Date(note.created_date), 'dd/MM • HH:mm', { locale: ptBR })}`}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span 
                          className={`text-xs px-2 py-0.5 rounded ${
                            note.type === 'INSIGHT' 
                              ? 'bg-[rgba(0,255,255,0.15)] text-[#00FFFF]' 
                              : 'bg-[rgba(139,92,246,0.15)] text-[#8B5CF6]'
                          }`}
                        >
                          {note.type === 'INSIGHT' ? 'Faísca' : 'Reunião'}
                        </span>
                        <span className="text-xs text-[#9AA0A6]">
                          {format(new Date(note.created_date), 'dd MMM • HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-[#9AA0A6] line-clamp-1">
                        {note.content}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinMutation.mutate({ id: note.id, pinned: note.pinned });
                        }}
                        className="p-1.5 text-[#9AA0A6] hover:text-[#FFD400] transition-colors"
                      >
                        <Pin className="w-4 h-4" fill={note.pinned ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(note.id);
                        }}
                        className="p-1.5 text-[#9AA0A6] hover:text-[#FF3B3B] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </OlimpoCard>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Type Selector Sheet */}
      <Sheet open={showTypeSelector} onOpenChange={setShowTypeSelector}>
        <SheetContent 
          side="bottom" 
          className="bg-[#0B0F0C] border-t-[rgba(0,255,102,0.18)]"
        >
          <SheetHeader>
            <SheetTitle className="text-[#00FF66]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Nova Nota
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 mt-6 pb-4">
            <button
              onClick={() => handleNewNote('INSIGHT')}
              className="w-full p-4 rounded-lg bg-[rgba(0,255,255,0.1)] border border-[rgba(0,255,255,0.3)] hover:bg-[rgba(0,255,255,0.15)] transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-[#00FFFF]" />
                <div>
                  <p className="font-semibold text-[#E8E8E8]">Faísca</p>
                  <p className="text-xs text-[#9AA0A6]">Ideia rápida</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => handleNewNote('MEETING')}
              className="w-full p-4 rounded-lg bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.3)] hover:bg-[rgba(139,92,246,0.15)] transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-5 h-5 text-[#8B5CF6]" />
                <div>
                  <p className="font-semibold text-[#E8E8E8]">Ata de Reunião</p>
                  <p className="text-xs text-[#9AA0A6]">Estruturada</p>
                </div>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Editors */}
      <InsightEditor
        open={showInsightEditor}
        onClose={() => {
          setShowInsightEditor(false);
          setEditingNote(null);
        }}
        note={editingNote}
      />
      <MeetingEditor
        open={showMeetingEditor}
        onClose={() => {
          setShowMeetingEditor(false);
          setEditingNote(null);
        }}
        note={editingNote}
      />

      <BottomNav />
    </div>
  );
}