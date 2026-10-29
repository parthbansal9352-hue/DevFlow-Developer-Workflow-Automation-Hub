/**
 * Project and Task Context Provider
 * Coordinates state for projects, tasks, activity logs, and automation execution.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import { activityService } from '../services/activityService';
import { automationService } from '../services/automationService';
import { computeDashboardStats } from '../services/statsService';
import { AUTOMATION_TRIGGERS } from '../config/constants';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const { user, isConfigured } = useAuth();
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastAutomationResults, setLastAutomationResults] = useState([]);

  // Active project object
  const activeProject = useMemo(() => {
    return projects.find((p) => p.$id === activeProjectId) || projects[0] || null;
  }, [projects, activeProjectId]);

  // Load all projects
  const fetchProjects = useCallback(async () => {
    if (!user || !isConfigured) {
      setProjects([]);
      return;
    }

    try {
      const items = await projectService.listProjects(user.$id);
      setProjects(items);
      if (items.length > 0 && !activeProjectId) {
        setActiveProjectId(items[0].$id);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError(err?.message || 'Failed to load projects');
    }
  }, [user, isConfigured, activeProjectId]);

  // Load tasks
  const fetchTasks = useCallback(async (projectId = activeProjectId) => {
    if (!user || !isConfigured) {
      setTasks([]);
      return;
    }

    try {
      const items = await taskService.listTasks(user.$id, {
        projectId: projectId || undefined,
      });
      setTasks(items);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError(err?.message || 'Failed to load tasks');
    }
  }, [user, isConfigured, activeProjectId]);

  // Load activities
  const fetchActivities = useCallback(async () => {
    if (!user || !isConfigured) {
      setActivities([]);
      return;
    }

    try {
      const items = await activityService.listActivities(user.$id, 30);
      setActivities(items);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    }
  }, [user, isConfigured]);

  // Initial load when user signs in
  useEffect(() => {
    if (user && isConfigured) {
      setLoading(true);
      Promise.all([fetchProjects(), fetchTasks(), fetchActivities()]).finally(() => {
        setLoading(false);
      });
    } else {
      setProjects([]);
      setTasks([]);
      setActivities([]);
    }
  }, [user, isConfigured, fetchProjects, fetchTasks, fetchActivities]);

  // When active project changes, reload tasks
  useEffect(() => {
    if (user && isConfigured && activeProjectId) {
      fetchTasks(activeProjectId);
    }
  }, [activeProjectId, user, isConfigured, fetchTasks]);

  // Create Project
  const createProject = async (data) => {
    if (!user) throw new Error('You must be signed in.');
    setError(null);
    try {
      const newProj = await projectService.createProject(data, user.$id);
      await activityService.logActivity({
        action: 'PROJECT_CREATED',
        details: `Created project "${newProj.name}"`,
        projectId: newProj.$id,
        actorId: user.$id,
        actorName: user.name || user.email,
        ownerId: user.$id,
      });
      await fetchProjects();
      await fetchActivities();
      setActiveProjectId(newProj.$id);
      return newProj;
    } catch (err) {
      setError(err?.message || 'Failed to create project');
      throw err;
    }
  };

  // Update Project
  const updateProject = async (projectId, updates) => {
    if (!user) throw new Error('You must be signed in.');
    setError(null);
    try {
      const updated = await projectService.updateProject(projectId, updates, user.$id);
      await activityService.logActivity({
        action: 'PROJECT_UPDATED',
        details: `Updated project "${updated.name}"`,
        projectId,
        actorId: user.$id,
        actorName: user.name || user.email,
        ownerId: user.$id,
      });
      await fetchProjects();
      await fetchActivities();
      return updated;
    } catch (err) {
      setError(err?.message || 'Failed to update project');
      throw err;
    }
  };

  // Archive Project
  const archiveProject = async (projectId, shouldArchive = true) => {
    if (!user) throw new Error('You must be signed in.');
    try {
      const updated = await projectService.archiveProject(projectId, shouldArchive);
      await activityService.logActivity({
        action: shouldArchive ? 'PROJECT_ARCHIVED' : 'PROJECT_RESTORED',
        details: `${shouldArchive ? 'Archived' : 'Restored'} project "${updated.name}"`,
        projectId,
        actorId: user.$id,
        actorName: user.name || user.email,
        ownerId: user.$id,
      });
      await fetchProjects();
      await fetchActivities();
      return updated;
    } catch (err) {
      setError(err?.message || 'Failed to archive project');
      throw err;
    }
  };

  // Delete Project
  const deleteProject = async (projectId) => {
    if (!user) throw new Error('You must be signed in.');
    try {
      await projectService.deleteProject(projectId);
      await activityService.logActivity({
        action: 'PROJECT_DELETED',
        details: `Deleted project (${projectId})`,
        projectId,
        actorId: user.$id,
        actorName: user.name || user.email,
        ownerId: user.$id,
      });
      await fetchProjects();
      await fetchActivities();
      if (activeProjectId === projectId) {
        setActiveProjectId('');
      }
    } catch (err) {
      setError(err?.message || 'Failed to delete project');
      throw err;
    }
  };

  // Link GitHub Repository to Project
  const linkProjectRepository = async (projectId, githubRepo) => {
    if (!user) throw new Error('You must be signed in.');
    setError(null);
    try {
      const updated = await projectService.linkRepository(projectId, githubRepo, user.$id);
      await activityService.logActivity({
        action: 'PROJECT_LINKED_GITHUB',
        details: `Linked GitHub repository "${githubRepo}" to project "${updated.name}"`,
        projectId,
        actorId: user.$id,
        actorName: user.name || user.email,
        ownerId: user.$id,
      });
      await fetchProjects();
      await fetchActivities();
      return updated;
    } catch (err) {
      setError(err?.message || 'Failed to link GitHub repository');
      throw err;
    }
  };

  // Unlink GitHub Repository from Project
  const unlinkProjectRepository = async (projectId) => {
    if (!user) throw new Error('You must be signed in.');
    setError(null);
    try {
      const updated = await projectService.unlinkRepository(projectId, user.$id);
      await activityService.logActivity({
        action: 'PROJECT_UNLINKED_GITHUB',
        details: `Unlinked GitHub repository from project "${updated.name}"`,
        projectId,
        actorId: user.$id,
        actorName: user.name || user.email,
        ownerId: user.$id,
      });
      await fetchProjects();
      await fetchActivities();
      return updated;
    } catch (err) {
      setError(err?.message || 'Failed to unlink GitHub repository');
      throw err;
    }
  };

  /**
   * Low-level task updater for automation SET_TASK_STATUS action.
   * Performs the db write only (no automation trigger to prevent loops).
   */
  const automationTaskUpdater = async (taskId, updates) => {
    return await taskService.updateTask(taskId, updates, user.$id);
  };

  // Create Task
  const createTask = async (data) => {
    if (!user) throw new Error('You must be signed in.');
    setError(null);
    try {
      const newTask = await taskService.createTask(data, user.$id);

      // Log activity
      await activityService.logActivity({
        action: 'TASK_CREATED',
        details: `Created task "${newTask.title}" [${newTask.priority.toUpperCase()}]`,
        projectId: newTask.projectId,
        taskId: newTask.$id,
        actorId: user.$id,
        actorName: user.name || user.email,
        ownerId: user.$id,
      });

      // Run automation engine for task.created
      const autoResults = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_CREATED,
        task: newTask,
        userId: user.$id,
        userName: user.name || user.email,
        taskUpdater: automationTaskUpdater,
      });
      setLastAutomationResults(autoResults);

      await fetchTasks(newTask.projectId);
      await fetchActivities();
      return newTask;
    } catch (err) {
      setError(err?.message || 'Failed to create task');
      throw err;
    }
  };

  // Update Task
  const updateTask = async (taskId, updates) => {
    if (!user) throw new Error('You must be signed in.');
    setError(null);
    const prevTask = tasks.find((t) => t.$id === taskId);

    try {
      const updated = await taskService.updateTask(taskId, updates, user.$id);

      // Detect trigger events
      let logDetails = `Updated task "${updated.title}"`;
      let logAction = 'TASK_UPDATED';
      const statusChanged = prevTask && prevTask.status !== updated.status;

      if (statusChanged) {
        logAction = 'TASK_STATUS_CHANGED';
        logDetails = `Changed status of "${updated.title}" from ${prevTask.status} to ${updated.status}`;
      }

      // Log activity
      await activityService.logActivity({
        action: logAction,
        details: logDetails,
        projectId: updated.projectId,
        taskId: updated.$id,
        actorId: user.$id,
        actorName: user.name || user.email,
        ownerId: user.$id,
      });

      // Run automation if status changed
      if (statusChanged) {
        const autoResults = await automationService.processStatusChange({
          task: updated,
          previousTask: prevTask,
          userId: user.$id,
          userName: user.name || user.email,
          taskUpdater: automationTaskUpdater,
        });
        setLastAutomationResults(autoResults);
      }

      await fetchTasks(updated.projectId);
      await fetchActivities();
      return updated;
    } catch (err) {
      setError(err?.message || 'Failed to update task');
      throw err;
    }
  };

  // Delete Task
  const deleteTask = async (taskId, projectId = activeProjectId) => {
    if (!user) throw new Error('You must be signed in.');
    const prevTask = tasks.find((t) => t.$id === taskId);
    try {
      await taskService.deleteTask(taskId);
      await activityService.logActivity({
        action: 'TASK_DELETED',
        details: `Deleted task "${prevTask ? prevTask.title : taskId}"`,
        projectId,
        taskId,
        actorId: user.$id,
        actorName: user.name || user.email,
        ownerId: user.$id,
      });
      await fetchTasks(projectId);
      await fetchActivities();
    } catch (err) {
      setError(err?.message || 'Failed to delete task');
      throw err;
    }
  };

  // Dashboard Stats strictly computed from real database records
  const stats = useMemo(() => {
    return computeDashboardStats(projects, tasks);
  }, [projects, tasks]);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        activeProjectId,
        setActiveProjectId,
        tasks,
        activities,
        stats,
        loading,
        error,
        lastAutomationResults,
        fetchProjects,
        fetchTasks,
        fetchActivities,
        createProject,
        updateProject,
        archiveProject,
        deleteProject,
        linkProjectRepository,
        unlinkProjectRepository,
        createTask,
        updateTask,
        deleteTask,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return ctx;
}
