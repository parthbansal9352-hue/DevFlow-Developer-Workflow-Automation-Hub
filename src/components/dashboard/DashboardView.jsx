import React from 'react';
import {
  FolderGit2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  TrendingUp,
  Activity,
  Plus,
  ArrowUpRight,
} from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export function DashboardView({ onOpenNewTask, onOpenNewProject, onOpenNewRule, onSelectTab }) {
  const { stats, activities } = useProjects();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Engineering Overview</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time analytics and task progression computed directly from Appwrite TablesDB.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={onOpenNewProject}>
            <FolderGit2 className="w-3.5 h-3.5" /> New Project
          </Button>
          <Button variant="primary" size="sm" onClick={onOpenNewTask}>
            <Plus className="w-3.5 h-3.5" /> Add Task
          </Button>
        </div>
      </div>

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="glass-card p-5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Projects</span>
            <div className="p-2 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-800/40">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">{stats.totalProjects}</span>
            <span className="text-xs text-emerald-400 font-medium">{stats.activeProjects} active</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {stats.archivedProjects} archived
          </p>
        </div>

        {/* Tasks Progression */}
        <div className="glass-card p-5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Total Tasks</span>
            <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">{stats.totalTasks}</span>
            <span className="text-xs text-emerald-400 font-medium">{stats.completionRate}% Done</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {stats.doneTasks} completed / {stats.totalTasks} total
          </p>
        </div>

        {/* In Flight */}
        <div className="glass-card p-5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">In Flight</span>
            <div className="p-2 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {stats.inProgressTasks + stats.inReviewTasks}
            </span>
            <span className="text-xs text-cyan-400 font-medium">Active</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {stats.inProgressTasks} In Progress &bull; {stats.inReviewTasks} In Review
          </p>
        </div>

        {/* Urgent & Overdue */}
        <div className="glass-card p-5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Attention Required</span>
            <div className="p-2 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-800/40">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {stats.priorityCounts.urgent}
            </span>
            <span className="text-xs text-rose-400 font-medium">Urgent</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {stats.overdueTasks} overdue task{stats.overdueTasks !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Middle Section: Task Status Distribution & Priority Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Breakdown */}
        <div className="lg:col-span-2 glass-card p-6 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" /> Task Status Distribution
            </h3>
            <button
              onClick={() => onSelectTab('tasks')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              View Board <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Multi-segment progress bar */}
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex mb-4 border border-slate-800">
            {stats.totalTasks > 0 ? (
              <>
                <div
                  style={{ width: `${(stats.todoTasks / stats.totalTasks) * 100}%` }}
                  title={`Todo: ${stats.todoTasks}`}
                  className="bg-slate-600 transition-all"
                />
                <div
                  style={{ width: `${(stats.inProgressTasks / stats.totalTasks) * 100}%` }}
                  title={`In Progress: ${stats.inProgressTasks}`}
                  className="bg-blue-500 transition-all"
                />
                <div
                  style={{ width: `${(stats.inReviewTasks / stats.totalTasks) * 100}%` }}
                  title={`In Review: ${stats.inReviewTasks}`}
                  className="bg-purple-500 transition-all"
                />
                <div
                  style={{ width: `${(stats.doneTasks / stats.totalTasks) * 100}%` }}
                  title={`Done: ${stats.doneTasks}`}
                  className="bg-emerald-500 transition-all"
                />
              </>
            ) : (
              <div className="w-full bg-slate-800 text-center text-[10px] text-slate-500">
                No tasks
              </div>
            )}
          </div>

          {/* Status Breakdown Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span>To Do</span>
              </div>
              <p className="text-lg font-bold text-slate-200 mt-1">{stats.todoTasks}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-xs text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>In Progress</span>
              </div>
              <p className="text-lg font-bold text-slate-200 mt-1">{stats.inProgressTasks}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-xs text-purple-400">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>In Review</span>
              </div>
              <p className="text-lg font-bold text-slate-200 mt-1">{stats.inReviewTasks}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Done</span>
              </div>
              <p className="text-lg font-bold text-slate-200 mt-1">{stats.doneTasks}</p>
            </div>
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="glass-card p-6 rounded-xl border border-slate-800/80">
          <h3 className="text-sm font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" /> Tasks by Priority
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-rose-950/20 border border-rose-900/30">
              <span className="text-xs font-medium text-rose-300">Urgent</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-900/60 text-rose-200">
                {stats.priorityCounts.urgent}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-950/20 border border-amber-900/30">
              <span className="text-xs font-medium text-amber-300">High</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-900/60 text-amber-200">
                {stats.priorityCounts.high}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-cyan-950/20 border border-cyan-900/30">
              <span className="text-xs font-medium text-cyan-300">Medium</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-200">
                {stats.priorityCounts.medium}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-800">
              <span className="text-xs font-medium text-slate-400">Low</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {stats.priorityCounts.low}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Activity Timeline Widget */}
      <div className="glass-card p-6 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" /> Recent Activity Log
          </h3>
          <button
            onClick={() => onSelectTab('activity')}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            All Logs <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activities.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No activity recorded yet. Actions on projects and tasks will appear here in real time.
          </p>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {activities.slice(0, 5).map((act) => (
              <div key={act.$id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                <div>
                  <span className="font-medium text-slate-200">{act.details}</span>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span>by {act.actorName || 'Developer'}</span>
                    <span>&bull;</span>
                    <span className="font-mono">{act.action}</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {act.$createdAt ? new Date(act.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
