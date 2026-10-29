import React, { useState } from 'react';
import { Plus, CheckSquare } from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { TaskFilters } from './TaskFilters';
import { TaskKanban } from './TaskKanban';
import { TaskList } from './TaskList';
import { TaskModal } from './TaskModal';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';

export function TasksView({ onOpenNewProject }) {
  const {
    tasks,
    activeProject,
    projects,
    createTask,
    updateTask,
    deleteTask,
  } = useProjects();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState('kanban'); // kanban | list
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = t.title && t.title.toLowerCase().includes(q);
      const matchDesc = t.description && t.description.toLowerCase().includes(q);
      const matchAssignee = t.assignee && t.assignee.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAssignee) return false;
    }
    return true;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'priority') {
      const weights = { urgent: 4, high: 3, medium: 2, low: 1 };
      return (weights[b.priority] || 0) - (weights[a.priority] || 0);
    }
    if (sortBy === 'dueDate') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    return new Date(b.$createdAt || 0) - new Date(a.$createdAt || 0);
  });

  const handleEditTask = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleCreateNewTask = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    await updateTask(taskId, { status: newStatus });
  };

  const handleModalSubmit = async (formData) => {
    if (editingTask) {
      await updateTask(editingTask.$id, formData);
    } else {
      await createTask(formData);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask(taskId);
    }
  };

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="No Project Selected"
        description="Tasks require a project workspace. Create a project first to start tracking items."
        actionLabel="Create Project"
        onAction={onOpenNewProject}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {activeProject ? activeProject.name : 'All Tasks'}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {tasks.length} tasks
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage issues, sprint progression, and task execution with real-time state synchronization.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleCreateNewTask}>
          <Plus className="w-4 h-4" /> Add Task
        </Button>
      </div>

      {/* Filter Bar */}
      <TaskFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* View Switcher: Kanban vs List */}
      {viewMode === 'kanban' ? (
        <TaskKanban
          tasks={sortedTasks}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <TaskList
          tasks={sortedTasks}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingTask}
      />
    </div>
  );
}
