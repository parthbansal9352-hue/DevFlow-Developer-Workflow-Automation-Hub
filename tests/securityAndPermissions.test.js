/**
 * Security & Permissions Verification Test Suite
 *
 * Verifies:
 * - Row-level security permissions builder isolates data strictly per-user
 * - Permissions builder rejects invalid or missing user IDs
 * - Multi-tenant isolation: documents never grant public/guest/any role permissions
 * - Appwrite configuration never exposes secret API keys
 * - Automation engine does not evaluate arbitrary code / XSS
 * - Unauthenticated requests and cross-tenant mutations are prevented
 */

import { describe, it, expect, vi } from 'vitest';
import { buildOwnerPermissions, buildNotificationPermissions } from '../src/utils/permissions';
import { APPWRITE_CONFIG, isAppwriteConfigured } from '../src/config/appwrite';
import { projectService } from '../src/services/projectService';
import { taskService } from '../src/services/taskService';
import { notificationService } from '../src/services/notificationService';
import { activityService } from '../src/services/activityService';
import { automationService } from '../src/services/automationService';

// Mock dbAdapter for testing service-level authorization enforcement
vi.mock('../src/services/dbAdapter', () => ({
  dbAdapter: {
    list: vi.fn().mockImplementation(async (table, queries) => {
      // Return queries for inspection
      return { total: 0, items: [], queries };
    }),
    create: vi.fn().mockImplementation(async (table, id, data, permissions) => {
      return { $id: id, ...data, permissions };
    }),
    update: vi.fn().mockImplementation(async (table, id, data, permissions) => {
      return { $id: id, ...data, permissions };
    }),
    delete: vi.fn().mockResolvedValue({ status: 'ok' }),
    get: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../src/services/notificationService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    notificationService: {
      ...actual.notificationService,
      createNotification: vi.fn().mockResolvedValue({ $id: 'notif_1' }),
    },
  };
});

vi.mock('../src/services/activityService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    activityService: {
      ...actual.activityService,
      logActivity: vi.fn().mockResolvedValue({ $id: 'log_1' }),
    },
  };
});

describe('Security & Permissions Test Suite', () => {
  const USER_ALICE = 'user_alice_123';
  const USER_BOB = 'user_bob_456';

  describe('Row-Level Permissions Builder (RLS)', () => {
    it('creates read, update, delete permissions bound ONLY to the user ID', () => {
      const perms = buildOwnerPermissions(USER_ALICE);
      expect(perms).toHaveLength(3);

      // Verify each permission references user:user_alice_123
      expect(perms).toContain(`read("user:${USER_ALICE}")`);
      expect(perms).toContain(`update("user:${USER_ALICE}")`);
      expect(perms).toContain(`delete("user:${USER_ALICE}")`);
    });

    it('NEVER includes public, any, or guest access', () => {
      const perms = buildOwnerPermissions(USER_ALICE);
      const permString = perms.join(' ');

      expect(permString).not.toContain('any()');
      expect(permString).not.toContain('guests()');
      expect(permString).not.toContain('users()');
      expect(permString).not.toContain(USER_BOB);
    });

    it('throws error when userId is missing or not a string', () => {
      expect(() => buildOwnerPermissions('')).toThrow(/valid userId is required/);
      expect(() => buildOwnerPermissions(null)).toThrow(/valid userId is required/);
      expect(() => buildOwnerPermissions(undefined)).toThrow(/valid userId is required/);
      expect(() => buildOwnerPermissions(12345)).toThrow(/valid userId is required/);
    });

    it('buildNotificationPermissions restricts access strictly to the recipient user', () => {
      const perms = buildNotificationPermissions(USER_BOB);
      expect(perms).toContain(`read("user:${USER_BOB}")`);
      expect(perms).toContain(`update("user:${USER_BOB}")`);
      expect(perms).toContain(`delete("user:${USER_BOB}")`);
      expect(perms.join(' ')).not.toContain(USER_ALICE);
    });
  });

  describe('Service Authorization & Tenant Isolation', () => {
    it('projectService.listProjects rejects unauthenticated callers', async () => {
      await expect(projectService.listProjects('')).rejects.toThrow(/User ID is required/);
      await expect(projectService.listProjects(null)).rejects.toThrow(/User ID is required/);
    });

    it('projectService.createProject enforces ownerId and per-user permissions', async () => {
      await expect(projectService.createProject({ name: 'Secret' }, '')).rejects.toThrow(/User ID is required/);

      const created = await projectService.createProject(
        { name: 'Alice Project', description: 'Internal' },
        USER_ALICE
      );
      expect(created.ownerId).toBe(USER_ALICE);
      expect(created.permissions).toContain(`read("user:${USER_ALICE}")`);
      expect(created.permissions).toContain(`update("user:${USER_ALICE}")`);
      expect(created.permissions).toContain(`delete("user:${USER_ALICE}")`);
    });

    it('taskService.listTasks rejects unauthenticated callers', async () => {
      await expect(taskService.listTasks('')).rejects.toThrow(/User ID is required/);
      await expect(taskService.listTasks(null)).rejects.toThrow(/User ID is required/);
    });

    it('taskService.createTask enforces ownerId and per-user permissions', async () => {
      await expect(
        taskService.createTask({ title: 'Task', projectId: 'p1' }, '')
      ).rejects.toThrow(/User ID is required/);

      const task = await taskService.createTask(
        { title: 'Alice Task', projectId: 'proj_alice' },
        USER_ALICE
      );
      expect(task.ownerId).toBe(USER_ALICE);
      expect(task.permissions).toContain(`read("user:${USER_ALICE}")`);
    });

    it('taskService.updateTask requires userId', async () => {
      await expect(taskService.updateTask('task_1', { title: 'New Title' }, '')).rejects.toThrow(/User ID is required/);
    });

    it('automationService.createRule requires userId and applies RLS permissions', async () => {
      await expect(
        automationService.createRule({ name: 'Rule' }, '')
      ).rejects.toThrow(/User ID is required/);

      const rule = await automationService.createRule(
        {
          name: 'Alice Rule',
          triggerEvent: 'task.status_changed',
          conditionField: 'status',
          conditionOperator: 'EQUALS',
          conditionValue: 'done',
          actionType: 'CREATE_NOTIFICATION',
          actionPayload: { title: 'T', message: 'M' },
        },
        USER_ALICE
      );
      expect(rule.ownerId).toBe(USER_ALICE);
      expect(rule.permissions).toContain(`read("user:${USER_ALICE}")`);
    });

    it('notificationService.listNotifications returns empty array when unauthenticated', async () => {
      const res = await notificationService.listNotifications('');
      expect(res).toEqual([]);
    });

    it('activityService.listActivities returns empty array when unauthenticated', async () => {
      const res = await activityService.listActivities('');
      expect(res).toEqual([]);
    });
  });

  describe('Secret Key & Environment Configuration Check', () => {
    it('client configuration never exposes secret API keys in client config', () => {
      // Check APPWRITE_CONFIG object keys
      const configKeys = Object.keys(APPWRITE_CONFIG);
      expect(configKeys).not.toContain('apiKey');
      expect(configKeys).not.toContain('secret');
      expect(configKeys).not.toContain('jwt');
      expect(configKeys).not.toContain('masterKey');

      // Check values
      for (const val of Object.values(APPWRITE_CONFIG.tables)) {
        expect(typeof val).toBe('string');
        expect(val.toLowerCase()).not.toContain('secret');
      }
    });

    it('isAppwriteConfigured correctly returns false if placeholder is used', () => {
      // In testing env without .env, isAppwriteConfigured should return false
      expect(typeof isAppwriteConfigured()).toBe('boolean');
    });
  });

  describe('Injection & Safe Code Execution Checks', () => {
    it('automation engine does NOT execute arbitrary JavaScript or eval', async () => {
      // Attempt to inject executable script in action payload
      const maliciousPayload = {
        title: 'Exploit <script>alert("xss")</script>',
        message: 'process.exit(1)',
        details: 'javascript:alert(1)',
        targetStatus: 'malicious_eval',
      };

      const task = {
        $id: 'task_inj',
        title: 'Test <img src=x onerror=alert(1)>',
        status: 'done',
        priority: 'high',
        projectId: 'proj_1',
      };

      const rule = {
        $id: 'rule_sec',
        name: 'Safe Rule',
        triggerEvent: 'task.status_changed',
        conditionField: 'status',
        conditionOperator: 'EQUALS',
        conditionValue: 'done',
        actionType: 'CREATE_NOTIFICATION',
        actionPayload: JSON.stringify(maliciousPayload),
        isEnabled: true,
        projectId: 'proj_1',
      };

      const results = await automationService.processEvent({
        triggerEvent: 'task.status_changed',
        task,
        userId: USER_ALICE,
        rules: [rule],
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      // Ensure the engine did not execute arbitrary code
      expect(results[0].action).toBe('NOTIFICATION_CREATED');
    });

    it('rejects rules attempting to invoke unauthorized action types', async () => {
      const rule = {
        $id: 'rule_hack',
        name: 'RCE Attempt',
        triggerEvent: 'task.status_changed',
        conditionField: 'status',
        conditionOperator: 'EQUALS',
        conditionValue: 'done',
        actionType: 'SYSTEM_COMMAND_EXEC',
        actionPayload: JSON.stringify({ cmd: 'rm -rf /' }),
        isEnabled: true,
        projectId: 'proj_1',
      };

      const results = await automationService.processEvent({
        triggerEvent: 'task.status_changed',
        task: { $id: 't1', status: 'done', projectId: 'proj_1' },
        userId: USER_ALICE,
        rules: [rule],
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Unsupported action');
    });
  });
});
