import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import OlimpoButton from '../olimpo/OlimpoButton';
import OlimpoCard from '../olimpo/OlimpoCard';
import LoadingSpinner from '../olimpo/LoadingSpinner';
import EmptyState from '../olimpo/EmptyState';
import CreateProjectModal from './CreateProjectModal';
import ProjectDetailSheet from './ProjectDetailSheet';
import { Plus, Folder, CheckCircle, Archive } from 'lucide-react';

export default function ProjectsSheet({ open, onClose }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editProject, setEditProject] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Project.filter({ created_by: user.email });
    },
    enabled: !!user?.email && open
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Task.filter({ created_by: user.email });
    },
    enabled: !!user?.email && open
  });

  const activeProjects = projects.filter(p => p.status === 'active');
  const closedProjects = projects.filter(p => p.status === 'closed');

  const getProjectStats = (projectId) => {
    const projectTasks = tasks.filter(t => t.projectId === projectId && !t.archived);
    const completed = projectTasks.filter(t => t.completed).length;
    return { total: projectTasks.length, completed };
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="bottom" className="bg-black border-t border-[rgba(0,255,102,0.18)] h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle 
              className="text-xl font-bold text-[#00FF66] mb-4"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              PROJETOS
            </SheetTitle>
          </SheetHeader>

          <OlimpoButton 
            className="w-full mb-6"
            onClick={() => { setEditProject(null); setShowCreateModal(true); }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Projeto
          </OlimpoButton>

          {isLoading ? (
            <LoadingSpinner size="lg" className="mt-8" />
          ) : activeProjects.length === 0 && closedProjects.length === 0 ? (
            <EmptyState
              icon={Folder}
              title="Nenhum projeto criado"
              description="Crie seu primeiro projeto para organizar tarefas"
              actionLabel="Criar Projeto"
              onAction={() => setShowCreateModal(true)}
            />
          ) : (
            <div className="space-y-6">
              {/* Active Projects */}
              {activeProjects.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[#9AA0A6] mb-3 uppercase">
                    Ativos
                  </h3>
                  <div className="space-y-3">
                    {activeProjects.map(project => {
                      const stats = getProjectStats(project.id);
                      const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
                      
                      return (
                        <OlimpoCard 
                          key={project.id}
                          className="cursor-pointer hover:border-[#00FF66] transition-all"
                          onClick={() => setSelectedProject(project)}
                        >
                          <div className="flex items-start gap-3">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${project.color}22`, border: `1px solid ${project.color}` }}
                            >
                              <Folder className="w-5 h-5" style={{ color: project.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-[#E8E8E8] mb-1">{project.name}</h4>
                              {project.description && (
                                <p className="text-xs text-[#9AA0A6] mb-2 line-clamp-2">{project.description}</p>
                              )}
                              <div className="flex items-center gap-3 text-xs text-[#9AA0A6]">
                                <span>{stats.completed}/{stats.total} tarefas</span>
                              </div>
                              {stats.total > 0 && (
                                <div className="mt-2 h-1.5 bg-[#070A08] rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all"
                                    style={{ 
                                      width: `${progress}%`,
                                      backgroundColor: project.color 
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </OlimpoCard>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Closed Projects */}
              {closedProjects.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[#9AA0A6] mb-3 uppercase">
                    Fechados
                  </h3>
                  <div className="space-y-3">
                    {closedProjects.map(project => {
                      const stats = getProjectStats(project.id);
                      
                      return (
                        <OlimpoCard 
                          key={project.id}
                          className="cursor-pointer opacity-60 hover:opacity-100 transition-all"
                          onClick={() => setSelectedProject(project)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[rgba(0,255,102,0.15)] flex items-center justify-center shrink-0">
                              <CheckCircle className="w-5 h-5 text-[#00FF66]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-[#9AA0A6] line-through mb-1">{project.name}</h4>
                              <div className="text-xs text-[#9AA0A6]">
                                {stats.total} tarefas concluídas
                              </div>
                            </div>
                          </div>
                        </OlimpoCard>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CreateProjectModal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditProject(null); }}
        project={editProject}
      />

      <ProjectDetailSheet
        open={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        project={selectedProject}
        onEdit={(project) => {
          setEditProject(project);
          setShowCreateModal(true);
          setSelectedProject(null);
        }}
      />
    </>
  );
}