/**
 * DevFlow Activity Service
 * Records audit logs for project, task, and automation rule events.
 */

import { APPWRITE_CONFIG, ID, Query } from '../config/appwrite';
import { dbAdapter } from './dbAdapter';
import { buildOwnerPermissions } from '../utils/permissions';

const TABLE_ACTIVITY_LOGS = APPWRITE_CONFIG.tables.activityLogs;

export const activityService = {
  /**
   * Log an activity event.
   * @param {object} params
   * @param {string} params.action - e.g. 'TASK_CREATED', 'TASK_STATUS_CHANGED', 'PROJECT_CREATED'
   * @param {string} params.details - Human readable description
   * @param {string} [params.projectId]
   * @param {string} [params.taskId]
   * @param {string} params.actorId
   * @param {string} params.actorName
   * @param {string} params.ownerId
   */
  async logActivity({ action, details, projectId = '', taskId = '', actorId, actorName, ownerId }) {
    if (!action || !details || !ownerId) {
      return null;
    }

    try {
      const logId = ID.unique();
      const permissions = buildOwnerPermissions(ownerId);

      const payload = {
        action,
        details,
        projectId: projectId || '',
        taskId: taskId || '',
        actorId: actorId || ownerId,
        actorName: actorName || 'Developer',
        ownerId,
      };

      return await dbAdapter.create(TABLE_ACTIVITY_LOGS, logId, payload, permissions);
    } catch (err) {
      console.warn('Failed to record activity log:', err.message);
      return null;
    }
  },

  /**
   * List recent activities for a user.
   * @param {string} userId
   * @param {number} [limit=25]
   */
  async listActivities(userId, limit = 25) {
    if (!userId) return [];

    try {
      const queries = [
        Query.equal('ownerId', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(limit),
      ];

      const res = await dbAdapter.list(TABLE_ACTIVITY_LOGS, queries);
      return res.items;
    } catch (err) {
      console.warn('Failed to fetch activity logs:', err.message);
      return [];
    }
  },
};
