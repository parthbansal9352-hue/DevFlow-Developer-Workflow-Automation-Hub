import React, { useState } from 'react';
import {
  FolderGit2,
  Plus,
  Archive,
  ArchiveRestore,
  Trash2,
  Edit2,
  ExternalLink,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ProjectModal } from './ProjectModal';

export function ProjectsView({ onSelectTab }) {
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    createProject,
    updateProject,
    archiveProject,
    deleteProject,
  } = useProjects();

  const [filter, setFilter] = useState('all'); // all | active | archived
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const filteredProjects = projects.filter((p) => {
    if (filter === 'active') return p.status === 'active';
    if (filter === 'archived') return p.status === 'archived';
    return true;
  });

  const handleEdit = (project) => {
    setEditingProject(project);
    setModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingProject(null);
    setModalOpen(true);
  };

  const handleModalSubmit = async (formData) => {
    if (editingProject) {
      await updateProject(editingProject.$id, formData);
    } else {
      await createProject(formData);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to permanently delete project "${name}"? This action cannot be undone.`)) {
      setDeletingId(id);
      try {
        await deleteProject(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Project Management</h2>
          <p className="text-xs text-slate-400 mt-1">
            Organize repositories, teams, and track deliverables with isolated project workspaces.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                filter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({projects.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                filter === 'active' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('archived')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                filter === 'archived' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Archived
            </button>
          </div>
          <Button variant="primary" size="sm" onClick={handleCreateNew}>
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title="No projects found"
          description={
            filter !== 'all'
              ? `There are no ${filter} projects matching this filter.`
              : 'Create your first project to start tracking tasks and configuring workflow automation.'
          }
          actionLabel="Create Project"
          onAction={handleCreateNew}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => {
            const isActiveWorkspace = activeProjectId === p.$id;
            const isArchived = p.status === 'archived';

            return (
              <div
                key={p.$id}
                className={`glass-card rounded-xl p-5 border flex flex-col justify-between transition-all ${
                  isActiveWorkspace
                    ? 'border-indigo-500/70 shadow-lg shadow-indigo-500/10'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
                        <FolderGit2 className="w-4 h-4" />
                      </div>
                      <h3 className="font-semibold text-slate-100 text-sm">{p.name}</h3>
                    </div>
                    <Badge variant={isArchived ? 'default' : 'success'}>
                      {p.status || 'active'}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-400 mb-4 line-clamp-2 min-h-[2rem]">
                    {p.description || 'No description provided.'}
                  </p>

                  {p.githubRepo && (
                    <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800 w-fit">
                      <span className="font-mono text-cyan-400">{p.githubRepo}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{p.$createdAt ? new Date(p.$createdAt).toLocaleDateString() : 'Recent'}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setActiveProjectId(p.$id);
                        onSelectTab('tasks');
                      }}
                      className="px-2.5 py-1 rounded text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 transition-colors cursor-pointer text-[11px] font-medium"
                    >
                      Open Board &rarr;
                    </button>
                    <button
                      onClick={() => handleEdit(p)}
                      title="Edit project"
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => archiveProject(p.$id, !isArchived)}
                      title={isArchived ? 'Restore project' : 'Archive project'}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
                    >
                      {isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(p.$id, p.name)}
                      disabled={deletingId === p.$id}
                      title="Delete project"
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingProject}
      />
    </div>
  );
}
