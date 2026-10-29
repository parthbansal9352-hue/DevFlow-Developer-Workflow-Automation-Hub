/**
 * DevFlow Dashboard Statistics Service
 * Computes live metrics strictly from database records.
 */

import { TASK_STATUSES, TASK_PRIORITIES, PROJECT_STATUSES } from '../config/constants';

/**
 * Computes dashboard statistics from authentic database project and task arrays.
 * @param {Array} projects - Array of project documents/rows
 * @param {Array} tasks - Array of task documents/rows
 * @returns {object} Calculated metrics object
 */
export function computeDashboardStats(projects = [], tasks = []) {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const totalProjects = safeProjects.length;
  const activeProjects = safeProjects.filter((p) => p.status === PROJECT_STATUSES.ACTIVE).length;
  const archivedProjects = safeProjects.filter((p) => p.status === PROJECT_STATUSES.ARCHIVED).length;

  const totalTasks = safeTasks.length;
  const todoTasks = safeTasks.filter((t) => t.status === TASK_STATUSES.TODO).length;
  const inProgressTasks = safeTasks.filter((t) => t.status === TASK_STATUSES.IN_PROGRESS).length;
  const inReviewTasks = safeTasks.filter((t) => t.status === TASK_STATUSES.IN_REVIEW).length;
  const doneTasks = safeTasks.filter((t) => t.status === TASK_STATUSES.DONE).length;

  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const priorityCounts = {
    [TASK_PRIORITIES.LOW]: safeTasks.filter((t) => t.priority === TASK_PRIORITIES.LOW).length,
    [TASK_PRIORITIES.MEDIUM]: safeTasks.filter((t) => t.priority === TASK_PRIORITIES.MEDIUM).length,
    [TASK_PRIORITIES.HIGH]: safeTasks.filter((t) => t.priority === TASK_PRIORITIES.HIGH).length,
    [TASK_PRIORITIES.URGENT]: safeTasks.filter((t) => t.priority === TASK_PRIORITIES.URGENT).length,
  };

  const now = new Date();
  const overdueTasks = safeTasks.filter((t) => {
    if (!t.dueDate || t.status === TASK_STATUSES.DONE) return false;
    const due = new Date(t.dueDate);
    return !isNaN(due.getTime()) && due < now;
  }).length;

  return {
    totalProjects,
    activeProjects,
    archivedProjects,
    totalTasks,
    todoTasks,
    inProgressTasks,
    inReviewTasks,
    doneTasks,
    completionRate,
    priorityCounts,
    overdueTasks,
  };
}
