/**
 * DevFlow Project Service
 * Handles CRUD for developer projects using TablesDB with per-user permissions.
 */

import { APPWRITE_CONFIG, ID, Query } from '../config/appwrite';
import { dbAdapter } from './dbAdapter';
import { buildOwnerPermissions } from '../utils/permissions';
import { validateProjectInput } from '../utils/validators';
import { PROJECT_STATUSES } from '../config/constants';

const TABLE_PROJECTS = APPWRITE_CONFIG.tables.projects;

export const projectService = {
  /**
   * List all projects owned by the authenticated user.
   * @param {string} userId
   * @param {string} [statusFilter]
   */
  async listProjects(userId, statusFilter = '') {
    if (!userId) throw new Error('User ID is required to list projects.');

    const queries = [
      Query.equal('ownerId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ];

    if (statusFilter && Object.values(PROJECT_STATUSES).includes(statusFilter)) {
      queries.push(Query.equal('status', statusFilter));
    }

    const res = await dbAdapter.list(TABLE_PROJECTS, queries);
    return res.items;
  },

  /**
   * Create a new project.
   * @param {object} data
   * @param {string} userId
   */
  async createProject(data, userId) {
    if (!userId) throw new Error('User ID is required to create a project.');

    const validation = validateProjectInput(data);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      throw new Error(firstError);
    }

    const projectId = ID.unique();
    const permissions = buildOwnerPermissions(userId);

    const projectPayload = {
      name: data.name.trim(),
      description: (data.description || '').trim(),
      status: data.status || PROJECT_STATUSES.ACTIVE,
      ownerId: userId,
      githubRepo: (data.githubRepo || '').trim(),
    };

    return await dbAdapter.create(TABLE_PROJECTS, projectId, projectPayload, permissions);
  },

  /**
   * Update an existing project.
   * @param {string} projectId
   * @param {object} updates
   * @param {string} userId
   */
  async updateProject(projectId, updates, userId) {
    if (!projectId) throw new Error('Project ID is required.');
    if (!userId) throw new Error('User ID is required.');

    const validation = validateProjectInput(updates, true);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      throw new Error(firstError);
    }

    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.description !== undefined) payload.description = updates.description.trim();
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.githubRepo !== undefined) payload.githubRepo = updates.githubRepo.trim();

    return await dbAdapter.update(TABLE_PROJECTS, projectId, payload);
  },

  /**
   * Archive or unarchive a project.
   * @param {string} projectId
   * @param {boolean} shouldArchive
   */
  async archiveProject(projectId, shouldArchive = true) {
    if (!projectId) throw new Error('Project ID is required.');
    const status = shouldArchive ? PROJECT_STATUSES.ARCHIVED : PROJECT_STATUSES.ACTIVE;
    return await dbAdapter.update(TABLE_PROJECTS, projectId, { status });
  },

  /**
   * Permanently delete a project.
   * @param {string} projectId
   */
  async deleteProject(projectId) {
    if (!projectId) throw new Error('Project ID is required.');
    return await dbAdapter.delete(TABLE_PROJECTS, projectId);
  },

  /**
   * Link a GitHub repository to a project.
   * @param {string} projectId
   * @param {string} githubRepo - e.g. "owner/repo"
   * @param {string} userId
   */
  async linkRepository(projectId, githubRepo, userId) {
    if (!projectId) throw new Error('Project ID is required.');
    if (!userId) throw new Error('User ID is required.');
    if (!githubRepo || typeof githubRepo !== 'string') {
      throw new Error('A valid GitHub repository identifier is required (e.g. owner/repo).');
    }

    const trimmed = githubRepo.trim();
    if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      throw new Error('Invalid repository format. Must be in owner/repo format.');
    }

    return await this.updateProject(projectId, { githubRepo: trimmed }, userId);
  },

  /**
   * Unlink any GitHub repository from a project.
   * @param {string} projectId
   * @param {string} userId
   */
  async unlinkRepository(projectId, userId) {
    if (!projectId) throw new Error('Project ID is required.');
    if (!userId) throw new Error('User ID is required.');

    return await this.updateProject(projectId, { githubRepo: '' }, userId);
  },
};
