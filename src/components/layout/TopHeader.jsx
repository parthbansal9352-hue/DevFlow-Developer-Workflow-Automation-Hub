import React, { useState } from 'react';
import { FolderGit2, Plus, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';
import { Button } from '../common/Button';
import { SetupGuideModal } from '../setup/SetupGuideModal';

export function TopHeader({ onOpenNewProjectModal }) {
  const { projects, activeProjectId, setActiveProjectId } = useProjects();
  const { isConfigured } = useAuth();
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  return (
    <>
      <header className="h-16 border-b border-slate-800 glass-panel px-6 flex items-center justify-between sticky top-0 z-30">
        {/* Left: Active Project Picker */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <FolderGit2 className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Project:</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={activeProjectId}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 hover:border-slate-600 rounded-lg text-xs font-medium text-slate-200 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {projects.length === 0 ? (
                <option value="">No projects found</option>
              ) : (
                projects.map((p) => (
                  <option key={p.$id} value={p.$id}>
                    {p.name} {p.status === 'archived' ? '(Archived)' : ''}
                  </option>
                ))
              )}
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={onOpenNewProjectModal}
              title="Create new project"
              className="h-8 px-2.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New</span>
            </Button>
          </div>
        </div>

        {/* Right: Status, Notifications, Help */}
        <div className="flex items-center gap-3">
          {/* Appwrite Status Badge */}
          <button
            onClick={() => setIsSetupOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer transition-colors ${
              isConfigured
                ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-amber-950/60 border-amber-800/60 text-amber-300 hover:bg-amber-900/60'
            }`}
          >
            {isConfigured ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Appwrite Connected</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Config Needed</span>
              </>
            )}
          </button>

          {/* Notifications */}
          <NotificationDropdown />
        </div>
      </header>

      <SetupGuideModal isOpen={isSetupOpen} onClose={() => setIsSetupOpen(false)} />
    </>
  );
}
