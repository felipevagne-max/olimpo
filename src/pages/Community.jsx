import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import BottomNav from '@/components/olimpo/BottomNav';
import TopBar from '@/components/olimpo/TopBar';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import RankingList from '@/components/community/RankingList';
import LevelDetails from '@/components/community/LevelDetails';
import { Swords, Plus, Trash2, MessageSquare, User } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      <TopBar />
      <div className="px-4 pt-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 
            className="text-xl font-bold text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            COMUNIDADE
          </h1>
        </div>
        <p className="text-sm text-[#9AA0A6] mb-6">
          Compartilhe conquistas, veja o ranking e explore níveis
        </p>

        {/* Quote */}
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

        {/* Tabs */}
        <Tabs defaultValue="posts" className="mb-4">
          <TabsList className="bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)] w-full grid grid-cols-3">
            <TabsTrigger 
              value="posts"
              className="data-[state=active]:bg-[rgba(0,255,102,0.15)] data-[state=active]:text-[#00FF66]"
            >
              Posts
            </TabsTrigger>
            <TabsTrigger 
              value="ranking"
              className="data-[state=active]:bg-[rgba(0,255,102,0.15)] data-[state=active]:text-[#00FF66]"
            >
              Ranking
            </TabsTrigger>
            <TabsTrigger 
              value="niveis"
              className="data-[state=active]:bg-[rgba(0,255,102,0.15)] data-[state=active]:text-[#00FF66]"
            >
              Níveis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-4">
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
            {posts.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-[#9AA0A6] mx-auto mb-3 opacity-50" />
                <p className="text-sm text-[#9AA0A6]">Mural vazio. Seja o primeiro!</p>
              </div>
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
          </TabsContent>

          <TabsContent value="ranking" className="mt-4">
            <RankingList />
          </TabsContent>

          <TabsContent value="niveis" className="mt-4">
            <LevelDetails />
          </TabsContent>
        </Tabs>
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