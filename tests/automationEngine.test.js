/**
 * Comprehensive Automation Engine Test Suite
 *
 * Tests cover:
 * - Condition evaluation (matching / non-matching)
 * - Disabled rules skipping
 * - Unsupported triggers and actions
 * - Duplicate event handling (deduplication)
 * - Loop prevention
 * - Permission / validation failures
 * - SET_TASK_STATUS action
 * - task.completed trigger
 * - Allowlist enforcement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { automationService, clearDeduplicationCache } from '../src/services/automationService';
import {
  AUTOMATION_OPERATORS,
  AUTOMATION_TRIGGERS,
  AUTOMATION_CONDITION_FIELDS,
  AUTOMATION_ACTIONS,
  TASK_STATUSES,
  SUPPORTED_TRIGGERS,
  SUPPORTED_ACTIONS,
} from '../src/config/constants';

// --------------------------------------------------------------------------
// Mock the downstream services so tests are unit-testable without Appwrite
// --------------------------------------------------------------------------
vi.mock('../src/services/notificationService', () => ({
  notificationService: {
    createNotification: vi.fn().mockResolvedValue({ $id: 'notif_1' }),
  },
}));

vi.mock('../src/services/activityService', () => ({
  activityService: {
    logActivity: vi.fn().mockResolvedValue({ $id: 'log_1' }),
  },
}));

vi.mock('../src/services/dbAdapter', () => ({
  dbAdapter: {
    list: vi.fn().mockResolvedValue({ total: 0, items: [] }),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../src/config/appwrite', () => ({
  APPWRITE_CONFIG: {
    endpoint: 'http://test',
    projectId: 'test',
    databaseId: 'test_db',
    tables: {
      projects: 'projects',
      tasks: 'tasks',
      automationRules: 'automation_rules',
      activityLogs: 'activity_logs',
      notifications: 'notifications',
    },
  },
  ID: { unique: () => 'test_id_' + Math.random().toString(36).substr(2, 6) },
  Query: {
    equal: (field, val) => `${field}=${val}`,
    orderDesc: (field) => `orderDesc(${field})`,
    limit: (n) => `limit(${n})`,
  },
  Permission: {
    read: (role) => `read(${role})`,
    update: (role) => `update(${role})`,
    delete: (role) => `delete(${role})`,
  },
  Role: {
    user: (id) => `user:${id}`,
    users: () => 'users',
  },
}));

// Import mocked services for assertion
import { notificationService } from '../src/services/notificationService';
import { activityService } from '../src/services/activityService';
import { dbAdapter } from '../src/services/dbAdapter';

describe('Automation Engine — Complete Test Suite', () => {
  const mockTask = {
    $id: 'task_abc',
    title: 'Fix critical database deadlock',
    status: 'done',
    priority: 'urgent',
    assignee: 'lead-dev',
    projectId: 'proj_1',
  };

  beforeEach(() => {
    clearDeduplicationCache();
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. Condition Evaluation
  // -----------------------------------------------------------------------
  describe('evaluateCondition', () => {
    it('evaluates EQUALS correctly (case-insensitive, trimmed)', () => {
      expect(automationService.evaluateCondition('done', AUTOMATION_OPERATORS.EQUALS, 'done')).toBe(true);
      expect(automationService.evaluateCondition('DONE', AUTOMATION_OPERATORS.EQUALS, '  done  ')).toBe(true);
      expect(automationService.evaluateCondition('in_progress', AUTOMATION_OPERATORS.EQUALS, 'done')).toBe(false);
    });

    it('evaluates NOT_EQUALS correctly', () => {
      expect(automationService.evaluateCondition('todo', AUTOMATION_OPERATORS.NOT_EQUALS, 'done')).toBe(true);
      expect(automationService.evaluateCondition('done', AUTOMATION_OPERATORS.NOT_EQUALS, 'done')).toBe(false);
    });

    it('evaluates CONTAINS correctly', () => {
      expect(automationService.evaluateCondition('alice@corp.com', AUTOMATION_OPERATORS.CONTAINS, 'alice')).toBe(true);
      expect(automationService.evaluateCondition('bob@corp.com', AUTOMATION_OPERATORS.CONTAINS, 'alice')).toBe(false);
    });

    it('returns false for unrecognized operator', () => {
      expect(automationService.evaluateCondition('test', 'UNKNOWN_OP', 'test')).toBe(false);
    });

    it('handles null/undefined values gracefully', () => {
      expect(automationService.evaluateCondition(null, AUTOMATION_OPERATORS.EQUALS, '')).toBe(true);
      expect(automationService.evaluateCondition(undefined, AUTOMATION_OPERATORS.EQUALS, 'something')).toBe(false);
      expect(automationService.evaluateCondition('value', AUTOMATION_OPERATORS.EQUALS, null)).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // 2. Trigger & Action Allowlist Validation
  // -----------------------------------------------------------------------
  describe('Allowlist Validation', () => {
    it('accepts all supported triggers', () => {
      expect(automationService.isSupportedTrigger(AUTOMATION_TRIGGERS.TASK_CREATED)).toBe(true);
      expect(automationService.isSupportedTrigger(AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED)).toBe(true);
      expect(automationService.isSupportedTrigger(AUTOMATION_TRIGGERS.TASK_COMPLETED)).toBe(true);
    });

    it('rejects unsupported triggers', () => {
      expect(automationService.isSupportedTrigger('task.deleted')).toBe(false);
      expect(automationService.isSupportedTrigger('TASK_PRIORITY_CHANGED')).toBe(false);
      expect(automationService.isSupportedTrigger('')).toBe(false);
      expect(automationService.isSupportedTrigger(null)).toBe(false);
    });

    it('accepts all supported actions', () => {
      expect(automationService.isSupportedAction(AUTOMATION_ACTIONS.CREATE_NOTIFICATION)).toBe(true);
      expect(automationService.isSupportedAction(AUTOMATION_ACTIONS.LOG_ACTIVITY)).toBe(true);
      expect(automationService.isSupportedAction(AUTOMATION_ACTIONS.SET_TASK_STATUS)).toBe(true);
    });

    it('rejects unsupported actions', () => {
      expect(automationService.isSupportedAction('SEND_EMAIL')).toBe(false);
      expect(automationService.isSupportedAction('EXECUTE_SCRIPT')).toBe(false);
      expect(automationService.isSupportedAction('')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // 3. processEvent: matching rules
  // -----------------------------------------------------------------------
  describe('processEvent — matching rules', () => {
    it('executes CREATE_NOTIFICATION when trigger and condition match', async () => {
      const rules = [{
        $id: 'rule_1',
        name: 'Notify when task is done',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        conditionValue: 'done',
        actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
        actionPayload: JSON.stringify({ title: 'Task Done', message: 'A task was completed' }),
        isEnabled: true,
        projectId: 'proj_1',
      }];

      const results = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        task: mockTask,
        userId: 'user_1',
        userName: 'Dev',
        rules,
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].action).toBe('NOTIFICATION_CREATED');
      expect(notificationService.createNotification).toHaveBeenCalledOnce();
    });

    it('executes LOG_ACTIVITY when trigger and condition match', async () => {
      const rules = [{
        $id: 'rule_2',
        name: 'Log when urgent',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_CREATED,
        conditionField: AUTOMATION_CONDITION_FIELDS.PRIORITY,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        conditionValue: 'urgent',
        actionType: AUTOMATION_ACTIONS.LOG_ACTIVITY,
        actionPayload: JSON.stringify({ details: 'Urgent task created' }),
        isEnabled: true,
        projectId: '',
      }];

      const results = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_CREATED,
        task: mockTask,
        userId: 'user_1',
        userName: 'Dev',
        rules,
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].action).toBe('ACTIVITY_LOGGED');
      expect(activityService.logActivity).toHaveBeenCalledOnce();
    });

    it('executes SET_TASK_STATUS action with valid target status', async () => {
      const taskUpdater = vi.fn().mockResolvedValue({});
      const taskInProgress = { ...mockTask, status: 'in_progress' };

      const rules = [{
        $id: 'rule_3',
        name: 'Auto-move to review',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        conditionValue: 'in_progress',
        actionType: AUTOMATION_ACTIONS.SET_TASK_STATUS,
        actionPayload: JSON.stringify({ targetStatus: 'in_review' }),
        isEnabled: true,
        projectId: '',
      }];

      const results = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        task: taskInProgress,
        userId: 'user_1',
        userName: 'Dev',
        rules,
        taskUpdater,
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].action).toBe('TASK_STATUS_UPDATED');
      expect(taskUpdater).toHaveBeenCalledWith('task_abc', { status: 'in_review' });
    });

    it('handles task.completed trigger', async () => {
      const rules = [{
        $id: 'rule_4',
        name: 'Celebrate completion',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_COMPLETED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        conditionValue: 'done',
        actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
        actionPayload: JSON.stringify({ title: 'Done!', message: 'Task completed' }),
        isEnabled: true,
        projectId: '',
      }];

      const results = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_COMPLETED,
        task: mockTask,
        userId: 'user_1',
        userName: 'Dev',
        rules,
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // 4. processEvent: non-matching conditions
  // -----------------------------------------------------------------------
  describe('processEvent — non-matching conditions', () => {
    it('skips rule when condition value does not match', async () => {
      const rules = [{
        $id: 'rule_5',
        name: 'Only for in_progress',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        conditionValue: 'in_progress',
        actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
        actionPayload: '{}',
        isEnabled: true,
        projectId: '',
      }];

      const results = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        task: mockTask, // status is 'done', not 'in_progress'
        userId: 'user_1',
        userName: 'Dev',
        rules,
      });

      expect(results).toHaveLength(0);
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    it('skips rule when trigger does not match', async () => {
      const rules = [{
        $id: 'rule_6',
        name: 'Only for task.created',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_CREATED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        conditionValue: 'done',
        actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
        actionPayload: '{}',
        isEnabled: true,
        projectId: '',
      }];

      const results = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED, // different trigger
        task: mockTask,
        userId: 'user_1',
        userName: 'Dev',
        rules,
      });

      expect(results).toHaveLength(0);
    });

    it('skips rule when project scope does not match', async () => {
      const rules = [{
        $id: 'rule_7',
        name: 'Only for proj_2',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        conditionValue: 'done',
        actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
        actionPayload: '{}',
        isEnabled: true,
        projectId: 'proj_2', // task is proj_1
      }];

      const results = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        task: mockTask,
        userId: 'user_1',
        userName: 'Dev',
        rules,
      });

      expect(results).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // 5. Disabled rules
  // -----------------------------------------------------------------------
  describe('processEvent — disabled rules', () => {
    it('skips disabled rules even when trigger and condition match', async () => {
      const rules = [{
        $id: 'rule_8',
        name: 'Disabled rule',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        conditionValue: 'done',
        actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
        actionPayload: '{}',
        isEnabled: false, // DISABLED
        projectId: '',
      }];

      const results = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        task: mockTask,
        userId: 'user_1',
        userName: 'Dev',
        rules,
      });

      expect(results).toHaveLength(0);
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 6. Unsupported triggers and actions
  // -----------------------------------------------------------------------
  describe('processEvent — unsupported triggers and actions', () => {
    it('returns empty array for unsupported trigger events', async () => {
      const results = await automationService.processEvent({
        triggerEvent: 'task.overdue', // not in allowlist
        task: mockTask,
        userId: 'user_1',
        userName: 'Dev',
        rules: [],
      });

      expect(results).toHaveLength(0);
    });

    it('reports error for rules with unsupported action types', async () => {
      const rules = [{
        $id: 'rule_9',
        name: 'Bad action rule',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        conditionValue: 'done',
        actionType: 'SEND_EMAIL', // not in allowlist
        actionPayload: '{}',
        isEnabled: true,
        projectId: '',
      }];

      const results = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        task: mockTask,
        userId: 'user_1',
        userName: 'Dev',
        rules,
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Unsupported action');
    });
  });

  // -----------------------------------------------------------------------
  // 7. Duplicate event handling
  // -----------------------------------------------------------------------
  describe('processEvent — deduplication', () => {
    it('skips duplicate events within the deduplication window', async () => {
      const rules = [{
        $id: 'rule_10',
        name: 'Dedup test rule',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        conditionValue: 'done',
        actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
        actionPayload: JSON.stringify({ title: 'Test', message: 'Test' }),
        isEnabled: true,
        projectId: '',
      }];

      // First call should execute
      const results1 = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        task: mockTask,
        userId: 'user_1',
        userName: 'Dev',
        rules,
      });
      expect(results1.filter(r => r.success)).toHaveLength(1);

      // Second call with same fingerprint should be deduplicated
      const results2 = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        task: mockTask,
        userId: 'user_1',
        userName: 'Dev',
        rules,
      });

      const dupes = results2.filter(r => r.action === 'SKIPPED_DUPLICATE');
      expect(dupes).toHaveLength(1);
      expect(dupes[0].error).toContain('Duplicate');
    });

    it('allows the same rule to fire for different tasks', async () => {
      const rules = [{
        $id: 'rule_11',
        name: 'Multi-task rule',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        conditionValue: 'done',
        actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
        actionPayload: JSON.stringify({ title: 'Test', message: 'Test' }),
        isEnabled: true,
        projectId: '',
      }];

      const results1 = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        task: mockTask,
        userId: 'user_1',
        userName: 'Dev',
        rules,
      });

      const differentTask = { ...mockTask, $id: 'task_xyz' };
      const results2 = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        task: differentTask,
        userId: 'user_1',
        userName: 'Dev',
        rules,
      });

      expect(results1.filter(r => r.success)).toHaveLength(1);
      expect(results2.filter(r => r.success)).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // 8. Loop prevention
  // -----------------------------------------------------------------------
  describe('processEvent — loop prevention', () => {
    it('blocks re-entrant processing for the same task and trigger', async () => {
      // Simulate a SET_TASK_STATUS action that tries to trigger another processEvent
      // for the same task during execution
      const taskUpdater = vi.fn().mockImplementation(async (taskId, updates) => {
        // This simulates what would happen if the updater re-triggered the engine
        const nestedResults = await automationService.processEvent({
          triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
          task: { ...mockTask, status: updates.status },
          userId: 'user_1',
          userName: 'Dev',
          rules: [{
            $id: 'rule_nested',
            name: 'Nested rule',
            triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
            conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
            conditionOperator: AUTOMATION_OPERATORS.EQUALS,
            conditionValue: 'in_review',
            actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
            actionPayload: '{}',
            isEnabled: true,
            projectId: '',
          }],
        });
        // The nested call should be blocked
        expect(nestedResults).toHaveLength(1);
        expect(nestedResults[0].action).toBe('SKIPPED');
        expect(nestedResults[0].error).toContain('Loop prevention');
      });

      const rules = [{
        $id: 'rule_12',
        name: 'Auto-move to review',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        conditionValue: 'done',
        actionType: AUTOMATION_ACTIONS.SET_TASK_STATUS,
        actionPayload: JSON.stringify({ targetStatus: 'in_review' }),
        isEnabled: true,
        projectId: '',
      }];

      const results = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        task: mockTask,
        userId: 'user_1',
        userName: 'Dev',
        rules,
        taskUpdater,
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(taskUpdater).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 9. Input validation edge cases
  // -----------------------------------------------------------------------
  describe('processEvent — validation edge cases', () => {
    it('returns empty array when triggerEvent is missing', async () => {
      const results = await automationService.processEvent({
        triggerEvent: null,
        task: mockTask,
        userId: 'user_1',
        userName: 'Dev',
      });
      expect(results).toHaveLength(0);
    });

    it('returns empty array when task is missing', async () => {
      const results = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_CREATED,
        task: null,
        userId: 'user_1',
        userName: 'Dev',
      });
      expect(results).toHaveLength(0);
    });

    it('returns empty array when userId is missing', async () => {
      const results = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_CREATED,
        task: mockTask,
        userId: '',
        userName: 'Dev',
      });
      expect(results).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // 10. SET_TASK_STATUS edge cases
  // -----------------------------------------------------------------------
  describe('SET_TASK_STATUS action — edge cases', () => {
    it('rejects invalid target status', async () => {
      const rules = [{
        $id: 'rule_13',
        name: 'Bad status rule',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_CREATED,
        conditionField: AUTOMATION_CONDITION_FIELDS.PRIORITY,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        conditionValue: 'urgent',
        actionType: AUTOMATION_ACTIONS.SET_TASK_STATUS,
        actionPayload: JSON.stringify({ targetStatus: 'nonexistent_status' }),
        isEnabled: true,
        projectId: '',
      }];

      const results = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_CREATED,
        task: mockTask,
        userId: 'user_1',
        userName: 'Dev',
        rules,
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Invalid target status');
    });

    it('skips update when task is already in target status', async () => {
      const taskUpdater = vi.fn();
      const rules = [{
        $id: 'rule_14',
        name: 'Redundant status',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        conditionValue: 'done',
        actionType: AUTOMATION_ACTIONS.SET_TASK_STATUS,
        actionPayload: JSON.stringify({ targetStatus: 'done' }), // same as current
        isEnabled: true,
        projectId: '',
      }];

      const results = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        task: mockTask, // status is 'done'
        userId: 'user_1',
        userName: 'Dev',
        rules,
        taskUpdater,
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true); // no-op is not a failure
      expect(results[0].error).toContain('already in target status');
      expect(taskUpdater).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 11. processStatusChange helper
  // -----------------------------------------------------------------------
  describe('processStatusChange', () => {
    it('fires both task.status_changed and task.completed when status becomes done', async () => {
      const rules = [
        {
          $id: 'rule_15',
          name: 'Status changed notification',
          triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
          conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
          conditionOperator: AUTOMATION_OPERATORS.EQUALS,
          conditionValue: 'done',
          actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
          actionPayload: JSON.stringify({ title: 'Status', message: 'Changed' }),
          isEnabled: true,
          projectId: '',
        },
        {
          $id: 'rule_16',
          name: 'Completed notification',
          triggerEvent: AUTOMATION_TRIGGERS.TASK_COMPLETED,
          conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
          conditionOperator: AUTOMATION_OPERATORS.EQUALS,
          conditionValue: 'done',
          actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
          actionPayload: JSON.stringify({ title: 'Complete', message: 'Done' }),
          isEnabled: true,
          projectId: '',
        },
      ];

      const results = await automationService.processStatusChange({
        task: mockTask,
        userId: 'user_1',
        userName: 'Dev',
        rules,
      });

      expect(results.filter(r => r.success)).toHaveLength(2);
      expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
    });

    it('only fires task.status_changed when new status is not done', async () => {
      const taskInProgress = { ...mockTask, status: 'in_progress' };
      const rules = [
        {
          $id: 'rule_17',
          name: 'Status changed log',
          triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
          conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
          conditionOperator: AUTOMATION_OPERATORS.EQUALS,
          conditionValue: 'in_progress',
          actionType: AUTOMATION_ACTIONS.LOG_ACTIVITY,
          actionPayload: JSON.stringify({ details: 'Started' }),
          isEnabled: true,
          projectId: '',
        },
        {
          $id: 'rule_18',
          name: 'Completed notification',
          triggerEvent: AUTOMATION_TRIGGERS.TASK_COMPLETED,
          conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
          conditionOperator: AUTOMATION_OPERATORS.EQUALS,
          conditionValue: 'done',
          actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
          actionPayload: JSON.stringify({ title: 'Complete', message: 'Done' }),
          isEnabled: true,
          projectId: '',
        },
      ];

      const results = await automationService.processStatusChange({
        task: taskInProgress,
        userId: 'user_1',
        userName: 'Dev',
        rules,
      });

      // Only the status_changed rule should fire (not task.completed)
      const successes = results.filter(r => r.success);
      expect(successes).toHaveLength(1);
      expect(successes[0].action).toBe('ACTIVITY_LOGGED');
      // task.completed is not triggered since status != 'done'
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 12. Fingerprint uniqueness
  // -----------------------------------------------------------------------
  describe('buildFingerprint', () => {
    it('generates distinct fingerprints for different rule/task combos', () => {
      const rule1 = { $id: 'r1', conditionField: 'status' };
      const rule2 = { $id: 'r2', conditionField: 'status' };
      const task1 = { $id: 't1', status: 'done' };
      const task2 = { $id: 't2', status: 'done' };

      const fp1 = automationService.buildFingerprint(rule1, task1, 'task.created');
      const fp2 = automationService.buildFingerprint(rule2, task1, 'task.created');
      const fp3 = automationService.buildFingerprint(rule1, task2, 'task.created');

      expect(fp1).not.toBe(fp2);
      expect(fp1).not.toBe(fp3);
    });
  });

  // -----------------------------------------------------------------------
  // 13. Global rules (empty projectId) match any project
  // -----------------------------------------------------------------------
  describe('processEvent — global rules', () => {
    it('global rule (empty projectId) matches tasks from any project', async () => {
      const rules = [{
        $id: 'rule_global',
        name: 'Global notification',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_CREATED,
        conditionField: AUTOMATION_CONDITION_FIELDS.PRIORITY,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        conditionValue: 'urgent',
        actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
        actionPayload: JSON.stringify({ title: 'Urgent!', message: 'Global alert' }),
        isEnabled: true,
        projectId: '', // global
      }];

      const results = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_CREATED,
        task: { ...mockTask, projectId: 'any_project_xyz' },
        userId: 'user_1',
        userName: 'Dev',
        rules,
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });
  });
});
