/**
 * Appwrite Row-Level Security Permissions Builder
 * Enforces per-user access control: only the owner can read, update, and delete their documents/rows.
 */

import { Permission, Role } from '../config/appwrite';

/**
 * Builds standard document/row permissions for a user.
 * @param {string} userId - Valid Appwrite User ID
 * @returns {string[]} Array of permission strings
 */
export function buildOwnerPermissions(userId) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('A valid userId is required to build owner permissions');
  }

  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
}

/**
 * Permissions for notifications: only the recipient user can read, update, or delete.
 * @param {string} recipientUserId
 * @returns {string[]}
 */
export function buildNotificationPermissions(recipientUserId) {
  return buildOwnerPermissions(recipientUserId);
}
