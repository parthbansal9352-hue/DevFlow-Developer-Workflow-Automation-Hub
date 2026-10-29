/**
 * DevFlow Task Service
 * Handles CRUD and state transitions for tasks using TablesDB with per-user permissions.
 */

import { APPWRITE_CONFIG, ID, Query } from '../config/appwrite';
import { dbAdapter } from './dbAdapter';
import { buildOwnerPermissions } from '../utils/permissions';
import { validateTaskInput } from '../utils/validators';
import { TASK_STATUSES, TASK_PRIORITIES } from '../config/constants';

const TABLE_TASKS = APPWRITE_CONFIG.tables.tasks;

export const taskService = {
  /**
   * List tasks for a user, optionally filtered by project, status, priority, and search term.
   * @param {string} userId
   * @param {object} [filters={}]
   */
  async listTasks(userId, filters = {}) {
    if (!userId) throw new Error('User ID is required to list tasks.');

    const queries = [
      Query.equal('ownerId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ];

    if (filters.projectId) {
      queries.push(Query.equal('projectId', filters.projectId));
    }
    if (filters.status && Object.values(TASK_STATUSES).includes(filters.status)) {
      queries.push(Query.equal('status', filters.status));
    }
    if (filters.priority && Object.values(TASK_PRIORITIES).includes(filters.priority)) {
      queries.push(Query.equal('priority', filters.priority));
    }

    const res = await dbAdapter.list(TABLE_TASKS, queries);
    let items = res.items;

    // In-memory search filter for title or description if search keyword is provided
    if (filters.search && typeof filters.search === 'string' && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      items = items.filter(
        (t) =>
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.assignee && t.assignee.toLowerCase().includes(q))
      );
    }

    // Sort order
    if (filters.sortBy === 'priority') {
      const priorityWeights = { urgent: 4, high: 3, medium: 2, low: 1 };
      items.sort((a, b) => (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0));
    } else if (filters.sortBy === 'dueDate') {
      items.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    }

    return items;
  },

  /**
   * Create a new task.
   * @param {object} data
   * @param {string} userId
   */
  async createTask(data, userId) {
    if (!userId) throw new Error('User ID is required to create a task.');

    const validation = validateTaskInput(data);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      throw new Error(firstError);
    }

    const taskId = ID.unique();
    const permissions = buildOwnerPermissions(userId);

    const taskPayload = {
      projectId: data.projectId,
      title: data.title.trim(),
      description: (data.description || '').trim(),
      status: data.status || TASK_STATUSES.TODO,
      priority: data.priority || TASK_PRIORITIES.MEDIUM,
      assignee: (data.assignee || '').trim(),
      dueDate: data.dueDate || '',
      ownerId: userId,
    };

    return await dbAdapter.create(TABLE_TASKS, taskId, taskPayload, permissions);
  },

  /**
   * Update an existing task.
   * @param {string} taskId
   * @param {object} updates
   * @param {string} userId
   */
  async updateTask(taskId, updates, userId) {
    if (!taskId) throw new Error('Task ID is required.');
    if (!userId) throw new Error('User ID is required.');

    const payload = {};
    if (updates.title !== undefined) {
      if (!updates.title.trim()) throw new Error('Task title cannot be empty.');
      payload.title = updates.title.trim();
    }
    if (updates.description !== undefined) payload.description = updates.description.trim();
    if (updates.status !== undefined) {
      if (!Object.values(TASK_STATUSES).includes(updates.status)) {
        throw new Error('Invalid task status.');
      }
      payload.status = updates.status;
    }
    if (updates.priority !== undefined) {
      if (!Object.values(TASK_PRIORITIES).includes(updates.priority)) {
        throw new Error('Invalid task priority.');
      }
      payload.priority = updates.priority;
    }
    if (updates.assignee !== undefined) payload.assignee = updates.assignee.trim();
    if (updates.dueDate !== undefined) payload.dueDate = updates.dueDate;
    if (updates.projectId !== undefined) payload.projectId = updates.projectId;

    return await dbAdapter.update(TABLE_TASKS, taskId, payload);
  },

  /**
   * Delete a task.
   * @param {string} taskId
   */
  async deleteTask(taskId) {
    if (!taskId) throw new Error('Task ID is required.');
    return await dbAdapter.delete(TABLE_TASKS, taskId);
  },
};
