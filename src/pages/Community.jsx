import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import BottomNav from '@/components/olimpo/BottomNav';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import EmptyState from '@/components/olimpo/EmptyState';
import { Swords, Plus, Trash2, Trophy, Zap, MessageSquare, User } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MOTIVATIONAL_QUOTES = [
  "A jornada de mil quilômetros começa com um único passo.",
  "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
  "Não espere por oportunidades, crie-as.",
  "A disciplina é a ponte entre metas e conquistas.",
  "Seu único limite é a sua mente.",
];

export default function Community() {
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => base44.entities.CommunityPost.list('-created_date')
  });

  const { data: xpTransactions = [] } = useQuery({
    queryKey: ['xpTransactions'],
    queryFn: () => base44.entities.XPTransaction.list()
  });

  const createPostMutation = useMutation({
    mutationFn: (content) => base44.entities.CommunityPost.create({ content, type: 'motivation' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
      setNewPost('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CommunityPost.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
      setDeleteId(null);
    }
  });

  const totalXP = xpTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const level = Math.floor(totalXP / 500) + 1;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    createPostMutation.mutate(newPost);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      <div className="px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 
            className="text-2xl font-bold text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            COMUNIDADE
          </h1>
        </div>
        <p className="text-[#9AA0A6] text-sm mb-6">Treine com outros heróis.</p>

        {/* Your Stats */}
        <OlimpoCard className="mb-6" glow>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[rgba(0,255,102,0.15)] flex items-center justify-center">
              <User className="w-7 h-7 text-[#00FF66]" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-[#E8E8E8]">{user?.full_name || 'Herói'}</p>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-[#FFC107]" />
                  <span className="text-sm font-mono text-[#FFC107]">Nv. {level}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-[#00FF66]" />
                  <span className="text-sm font-mono text-[#00FF66]">{totalXP} XP</span>
                </div>
              </div>
            </div>
          </div>
        </OlimpoCard>

        {/* Quote of the Day */}
        <OlimpoCard className="mb-6">
          <div className="flex items-start gap-3">
            <Swords className="w-5 h-5 text-[#00FF66] mt-0.5" />
            <div>
              <p className="text-xs text-[#9AA0A6] mb-1">Frase do Dia</p>
              <p className="text-sm text-[#E8E8E8] italic">
                "{MOTIVATIONAL_QUOTES[new Date().getDate() % MOTIVATIONAL_QUOTES.length]}"
              </p>
            </div>
          </div>
        </OlimpoCard>

        {/* New Post */}
        <OlimpoCard className="mb-6">
          <form onSubmit={handleSubmit}>
            <Textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Compartilhe sua motivação..."
              className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8] placeholder:text-[#9AA0A6] focus:border-[#00FF66] resize-none mb-3"
              rows={3}
            />
            <OlimpoButton 
              type="submit" 
              className="w-full"
              disabled={!newPost.trim() || createPostMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-2" />
              Publicar
            </OlimpoButton>
          </form>
        </OlimpoCard>

        {/* Posts Feed */}
        <h2 className="text-sm font-semibold text-[#E8E8E8] mb-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          Mural
        </h2>

        {posts.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Mural vazio"
            description="Seja o primeiro a compartilhar uma mensagem motivacional!"
          />
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <OlimpoCard key={post.id}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-[rgba(0,255,102,0.15)] flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-[#00FF66]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-[#9AA0A6] mb-1">
                        {post.created_by?.split('@')[0] || 'Anônimo'} • {format(new Date(post.created_date), 'dd/MM HH:mm')}
                      </p>
                      <p className="text-sm text-[#E8E8E8]">{post.content}</p>
                    </div>
                  </div>
                  {post.created_by === user?.email && (
                    <button
                      onClick={() => setDeleteId(post.id)}
                      className="p-1 text-[#9AA0A6] hover:text-[#FF3B3B]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </OlimpoCard>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#E8E8E8]">Excluir post?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#9AA0A6]">
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(deleteId)}
              className="bg-[#FF3B3B] text-white hover:bg-[#DD2B2B]"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}