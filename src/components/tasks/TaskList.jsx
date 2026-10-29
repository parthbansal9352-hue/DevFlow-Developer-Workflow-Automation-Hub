import React from 'react';
import { Edit2, Trash2, Calendar, User, Clock } from 'lucide-react';
import { TASK_STATUSES, TASK_STATUS_LIST, TASK_PRIORITIES, TASK_PRIORITY_LIST } from '../../config/constants';
import { Badge } from '../common/Badge';

export function TaskList({ tasks, onEditTask, onDeleteTask, onStatusChange }) {
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case TASK_PRIORITIES.URGENT:
        return <Badge variant="danger">Urgent</Badge>;
      case TASK_PRIORITIES.HIGH:
        return <Badge variant="warning">High</Badge>;
      case TASK_PRIORITIES.MEDIUM:
        return <Badge variant="cyan">Medium</Badge>;
      default:
        return <Badge variant="default">Low</Badge>;
    }
  };

  return (
    <div className="glass-card rounded-xl border border-slate-800 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
              <th className="py-3 px-4">Task</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Assignee</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No tasks found matching your filters.
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const isOverdue =
                  task.dueDate &&
                  task.status !== TASK_STATUSES.DONE &&
                  new Date(task.dueDate) < new Date();

                return (
                  <tr key={task.$id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Task Title & Desc */}
                    <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                      <p className="font-medium text-slate-100 truncate">{task.title}</p>
                      {task.description && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {task.description}
                        </p>
                      )}
                    </td>

                    {/* Status Select */}
                    <td className="py-3.5 px-4">
                      <select
                        value={task.status}
                        onChange={(e) => onStatusChange(task.$id, e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded text-[11px] px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        {TASK_STATUS_LIST.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4">{getPriorityBadge(task.priority)}</td>

                    {/* Assignee */}
                    <td className="py-3.5 px-4 text-slate-300">
                      {task.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span>{task.assignee}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Due Date */}
                    <td className="py-3.5 px-4">
                      {task.dueDate ? (
                        <div
                          className={`flex items-center gap-1.5 ${
                            isOverdue ? 'text-rose-400 font-medium' : 'text-slate-400'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditTask(task)}
                          title="Edit Task"
                          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteTask(task.$id)}
                          title="Delete Task"
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
