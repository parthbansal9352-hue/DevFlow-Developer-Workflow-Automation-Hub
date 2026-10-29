import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider, useProjects } from './context/ProjectContext';
import { NotificationProvider } from './context/NotificationContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { SetupBanner } from './components/layout/SetupBanner';
import { AuthPage } from './components/auth/AuthPage';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProjectsView } from './components/projects/ProjectsView';
import { TasksView } from './components/tasks/TasksView';
import { AutomationView } from './components/automation/AutomationView';
import { GitHubView } from './components/github/GitHubView';
import { ActivityView } from './components/activity/ActivityView';
import { ProjectModal } from './components/projects/ProjectModal';
import { TaskModal } from './components/tasks/TaskModal';
import { Spinner } from './components/common/Spinner';

function MainApp() {
  const { user, loading: authLoading } = useAuth();
  const { createProject, createTask } = useProjects();
  const [activeTab, setActiveTab] = useState('overview'); // overview | projects | tasks | automation | activity

  // Global Quick Action Modals
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const handleCreateProject = async (data) => {
    await createProject(data);
  };

  const handleCreateTask = async (data) => {
    await createTask(data);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col antialiased">
      <SetupBanner />

      <div className="flex flex-1 min-h-0">
        {/* Left Navigation Sidebar */}
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopHeader onOpenNewProjectModal={() => setProjectModalOpen(true)} />

          <main className="flex-1 p-6 max-w-7xl w-full mx-auto overflow-y-auto">
            {activeTab === 'overview' && (
              <DashboardView
                onOpenNewTask={() => setTaskModalOpen(true)}
                onOpenNewProject={() => setProjectModalOpen(true)}
                onOpenNewRule={() => setRuleModalOpen(true)}
                onSelectTab={setActiveTab}
              />
            )}

            {activeTab === 'projects' && (
              <ProjectsView onSelectTab={setActiveTab} />
            )}

            {activeTab === 'tasks' && (
              <TasksView onOpenNewProject={() => setProjectModalOpen(true)} />
            )}

            {activeTab === 'automation' && <AutomationView />}

            {activeTab === 'github' && <GitHubView />}

            {activeTab === 'activity' && <ActivityView />}
          </main>
        </div>
      </div>

      {/* Global Modals for Quick Creation */}
      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSubmit={handleCreateProject}
      />

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSubmit={handleCreateTask}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <NotificationProvider>
          <MainApp />
        </NotificationProvider>
      </ProjectProvider>
    </AuthProvider>
  );
}
