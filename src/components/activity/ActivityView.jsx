import React from 'react';
import { Activity, Clock, User, ShieldCheck } from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { EmptyState } from '../common/EmptyState';
import { Badge } from '../common/Badge';

export function ActivityView() {
  const { activities, projects } = useProjects();

  const getActionBadgeVariant = (action) => {
    if (action.includes('CREATED')) return 'success';
    if (action.includes('DELETED')) return 'danger';
    if (action.includes('ARCHIVED')) return 'default';
    if (action.includes('STATUS')) return 'cyan';
    if (action.includes('AUTOMATION')) return 'primary';
    return 'default';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Activity Audit Trail</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {activities.length} entries
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Immutable event log of project updates, task mutations, and automation executions.
        </p>
      </div>

      {/* Activity Timeline List */}
      {activities.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No Activity Logged"
          description="Actions performed by users and automation rules will be recorded and displayed here."
        />
      ) : (
        <div className="glass-card rounded-xl border border-slate-800 p-5 divide-y divide-slate-800/60">
          {activities.map((act) => {
            const projectName = projects.find((p) => p.$id === act.projectId)?.name;

            return (
              <div key={act.$id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={getActionBadgeVariant(act.action)}>
                      {act.action}
                    </Badge>
                    {projectName && (
                      <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {projectName}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-200 font-medium leading-relaxed">
                    {act.details}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      <span>{act.actorName || 'Developer'}</span>
                    </div>
                    <span>&bull;</span>
                    <span className="font-mono text-[10px] text-slate-500">ID: {act.$id.slice(0, 10)}...</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {act.$createdAt
                      ? new Date(act.$createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Recently'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
