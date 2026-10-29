import React from 'react';
import {
  Calendar,
  User,
  ArrowRight,
  ArrowLeft,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { TASK_STATUSES, TASK_STATUS_LIST, TASK_PRIORITIES } from '../../config/constants';
import { Badge } from '../common/Badge';

export function TaskKanban({ tasks, onEditTask, onDeleteTask, onStatusChange }) {
  const columns = [
    { id: TASK_STATUSES.TODO, label: 'To Do', color: 'border-slate-700 bg-slate-900/30' },
    { id: TASK_STATUSES.IN_PROGRESS, label: 'In Progress', color: 'border-blue-800/40 bg-blue-950/10' },
    { id: TASK_STATUSES.IN_REVIEW, label: 'In Review', color: 'border-purple-800/40 bg-purple-950/10' },
    { id: TASK_STATUSES.DONE, label: 'Done', color: 'border-emerald-800/40 bg-emerald-950/10' },
  ];

  const getPriorityBadgeVariant = (priority) => {
    switch (priority) {
      case TASK_PRIORITIES.URGENT:
        return 'danger';
      case TASK_PRIORITIES.HIGH:
        return 'warning';
      case TASK_PRIORITIES.MEDIUM:
        return 'cyan';
      default:
        return 'default';
    }
  };

  const getNextStatus = (current) => {
    switch (current) {
      case TASK_STATUSES.TODO:
        return TASK_STATUSES.IN_PROGRESS;
      case TASK_STATUSES.IN_PROGRESS:
        return TASK_STATUSES.IN_REVIEW;
      case TASK_STATUSES.IN_REVIEW:
        return TASK_STATUSES.DONE;
      default:
        return null;
    }
  };

  const getPrevStatus = (current) => {
    switch (current) {
      case TASK_STATUSES.DONE:
        return TASK_STATUSES.IN_REVIEW;
      case TASK_STATUSES.IN_REVIEW:
        return TASK_STATUSES.IN_PROGRESS;
      case TASK_STATUSES.IN_PROGRESS:
        return TASK_STATUSES.TODO;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
      {columns.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.id);

        return (
          <div
            key={col.id}
            className={`rounded-xl border ${col.color} p-3 flex flex-col min-h-[500px]`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200">{col.label}</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {columnTasks.length}
                </span>
              </div>
            </div>

            {/* Task Cards Column */}
            <div className="space-y-3 flex-1 overflow-y-auto">
              {columnTasks.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-slate-400 border border-dashed border-slate-800 rounded-lg">
                  No tasks
                </div>
              ) : (
                columnTasks.map((task) => {
                  const nextStatus = getNextStatus(task.status);
                  const prevStatus = getPrevStatus(task.status);
                  const isOverdue =
                    task.dueDate &&
                    task.status !== TASK_STATUSES.DONE &&
                    new Date(task.dueDate) < new Date();

                  return (
                    <div
                      key={task.$id}
                      className="glass-card rounded-lg p-3.5 border border-slate-800 hover:border-slate-700/80 transition-all shadow-sm"
                    >
                      {/* Priority and Actions */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge variant={getPriorityBadgeVariant(task.priority)}>
                          {task.priority || 'medium'}
                        </Badge>
                        <div className="flex items-center gap-1 opacity-80 hover:opacity-100">
                          <button
                            onClick={() => onEditTask(task)}
                            title="Edit Task"
                            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteTask(task.$id)}
                            title="Delete Task"
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-semibold text-slate-100 leading-snug mb-1">
                        {task.title}
                      </h4>

                      {/* Description Preview */}
                      {task.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {/* Meta: Assignee & Due Date */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 mb-2">
                        {task.assignee ? (
                          <div className="flex items-center gap-1 truncate max-w-[120px]" title={task.assignee}>
                            <User className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{task.assignee}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[10px]">Unassigned</span>
                        )}

                        {task.dueDate && (
                          <div
                            className={`flex items-center gap-1 text-[10px] ${
                              isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-400'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                          </div>
                        )}
                      </div>

                      {/* State Transitions Quick Controls */}
                      <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-800/60">
                        {prevStatus ? (
                          <button
                            onClick={() => onStatusChange(task.$id, prevStatus)}
                            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                            title={`Move to ${prevStatus}`}
                          >
                            <ArrowLeft className="w-2.5 h-2.5" /> Back
                          </button>
                        ) : (
                          <span />
                        )}

                        {nextStatus ? (
                          <button
                            onClick={() => onStatusChange(task.$id, nextStatus)}
                            className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/50 px-1.5 py-0.5 rounded cursor-pointer font-medium transition-colors ml-auto"
                            title={`Move to ${nextStatus}`}
                          >
                            Advance <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium ml-auto">
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
