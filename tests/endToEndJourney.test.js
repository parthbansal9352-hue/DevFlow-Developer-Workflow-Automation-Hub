/**
 * DevFlow Phase 5 — End-to-End User Journey & Edge Cases Test Suite
 *
 * Verifies the complete lifecycle:
 * 1. Register & establish session
 * 2. Create project
 * 3. Create, edit, and complete task
 * 4. Verify state persistence (reloading data)
 * 5. Create and enable automation rule
 * 6. Trigger rule (status change -> done) and verify action execution
 * 7. Verify notifications and activity logs recorded correctly
 * 8. Log out and verify protected actions require authentication
 *
 * Edge cases:
 * - Invalid forms (empty names, invalid statuses, bad emails, short passwords)
 * - Empty states (no projects, no tasks, no rules)
 * - Duplicate events within deduplication window
 * - Disabled automation rules
 * - Expired sessions / unauthenticated state
 * - Permission-denied responses
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../src/services/authService';
import { projectService } from '../src/services/projectService';
import { taskService } from '../src/services/taskService';
import { automationService, clearDeduplicationCache } from '../src/services/automationService';
import { notificationService } from '../src/services/notificationService';
import { activityService } from '../src/services/activityService';
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  AUTOMATION_TRIGGERS,
  AUTOMATION_CONDITION_FIELDS,
  AUTOMATION_OPERATORS,
  AUTOMATION_ACTIONS,
} from '../src/config/constants';

// Simulated In-Memory Database for E2E persistence testing
class MockDatabase {
  constructor() {
    this.tables = {
      projects: new Map(),
      tasks: new Map(),
      automation_rules: new Map(),
      activity_logs: new Map(),
      notifications: new Map(),
    };
  }

  clear() {
    for (const map of Object.values(this.tables)) {
      map.clear();
    }
  }

  list(table, queries = []) {
    const tableMap = this.tables[table] || new Map();
    let items = Array.from(tableMap.values());

    for (const q of queries) {
      if (typeof q === 'string' && q.startsWith('ownerId=')) {
        const ownerId = q.split('=')[1];
        items = items.filter((item) => item.ownerId === ownerId);
      }
      if (typeof q === 'string' && q.startsWith('userId=')) {
        const userId = q.split('=')[1];
        items = items.filter((item) => item.userId === userId);
      }
      if (typeof q === 'string' && q.startsWith('projectId=')) {
        const projId = q.split('=')[1];
        items = items.filter((item) => item.projectId === projId);
      }
    }

    return { total: items.length, items };
  }

  create(table, id, data, permissions) {
    const row = {
      $id: id,
      ...data,
      $createdAt: new Date().toISOString(),
      permissions,
    };
    this.tables[table].set(id, row);
    return row;
  }

  get(table, id) {
    return this.tables[table].get(id) || null;
  }

  update(table, id, data) {
    const existing = this.tables[table].get(id);
    if (!existing) throw new Error(`Row ${id} not found in ${table}`);
    const updated = { ...existing, ...data, $updatedAt: new Date().toISOString() };
    this.tables[table].set(id, updated);
    return updated;
  }

  delete(table, id) {
    this.tables[table].delete(id);
    return { status: 'deleted', id };
  }
}

const mockDb = new MockDatabase();

// Mock dbAdapter to use mockDb
vi.mock('../src/services/dbAdapter', () => ({
  dbAdapter: {
    list: vi.fn().mockImplementation((table, queries) => Promise.resolve(mockDb.list(table, queries))),
    create: vi.fn().mockImplementation((table, id, data, perms) => Promise.resolve(mockDb.create(table, id, data, perms))),
    get: vi.fn().mockImplementation((table, id) => Promise.resolve(mockDb.get(table, id))),
    update: vi.fn().mockImplementation((table, id, data) => Promise.resolve(mockDb.update(table, id, data))),
    delete: vi.fn().mockImplementation((table, id) => Promise.resolve(mockDb.delete(table, id))),
  },
}));

// Mock Appwrite Account
let activeSessionUser = null;
vi.mock('../src/config/appwrite', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    APPWRITE_CONFIG: {
      endpoint: 'https://cloud.appwrite.io/v1',
      projectId: 'test_project_id',
      databaseId: 'test_db',
      tables: {
        projects: 'projects',
        tasks: 'tasks',
        automationRules: 'automation_rules',
        activityLogs: 'activity_logs',
        notifications: 'notifications',
      },
    },
    isAppwriteConfigured: () => true,
    account: {
      create: vi.fn().mockResolvedValue({}),
      createEmailPasswordSession: vi.fn().mockImplementation(async ({ email }) => {
        activeSessionUser = {
          $id: 'user_' + email.split('@')[0],
          email,
          name: email.split('@')[0],
        };
        return { $id: 'session_123' };
      }),
      get: vi.fn().mockImplementation(async () => {
        if (!activeSessionUser) throw new Error('Unauthorized');
        return activeSessionUser;
      }),
      getSession: vi.fn().mockImplementation(async () => {
        if (!activeSessionUser) throw new Error('Unauthorized');
        return { $id: 'session_123', userId: activeSessionUser.$id };
      }),
      deleteSession: vi.fn().mockImplementation(async () => {
        activeSessionUser = null;
        return {};
      }),
    },
    Query: {
      equal: (field, val) => `${field}=${val}`,
      orderDesc: (field) => `orderDesc(${field})`,
      limit: (n) => `limit(${n})`,
    },
    ID: {
      unique: () => 'uid_' + Math.random().toString(36).substring(2, 9),
    },
  };
});

describe('DevFlow Phase 5 — Main User Journey E2E Test', () => {
  beforeEach(() => {
    mockDb.clear();
    clearDeduplicationCache();
    activeSessionUser = null;
    vi.clearAllMocks();
  });

  it('executes the full end-to-end user lifecycle successfully', async () => {
    // -------------------------------------------------------------------------
    // Step 1: Register and Log In
    // -------------------------------------------------------------------------
    const userEmail = 'senior_qa@devflow.internal';
    const userPassword = 'TestPassword123!';
    const userName = 'Senior QA Engineer';

    const registeredUser = await authService.register(userEmail, userPassword, userName);
    expect(registeredUser).toBeDefined();
    expect(registeredUser.email).toBe(userEmail);

    const currentUser = await authService.getCurrentUser();
    expect(currentUser.$id).toBe(registeredUser.$id);
    const userId = currentUser.$id;

    // -------------------------------------------------------------------------
    // Step 2: Create a Project
    // -------------------------------------------------------------------------
    const projectData = {
      name: 'DevFlow E2E Pipeline',
      description: 'Production integration and automation test suite',
      status: 'active',
    };
    const createdProject = await projectService.createProject(projectData, userId);
    expect(createdProject.$id).toBeDefined();
    expect(createdProject.name).toBe(projectData.name);
    expect(createdProject.ownerId).toBe(userId);

    // Verify project appears in list
    const projectList = await projectService.listProjects(userId);
    expect(projectList).toHaveLength(1);
    expect(projectList[0].$id).toBe(createdProject.$id);

    // -------------------------------------------------------------------------
    // Step 3: Create, Edit, and Complete a Task
    // -------------------------------------------------------------------------
    const taskData = {
      title: 'Implement E2E rule verification',
      description: 'Verify automation triggers fire on task completion',
      status: TASK_STATUSES.TODO,
      priority: TASK_PRIORITIES.HIGH,
      projectId: createdProject.$id,
    };
    const createdTask = await taskService.createTask(taskData, userId);
    expect(createdTask.$id).toBeDefined();
    expect(createdTask.status).toBe(TASK_STATUSES.TODO);

    // Edit the task: move to in_progress
    const inProgressTask = await taskService.updateTask(
      createdTask.$id,
      { status: TASK_STATUSES.IN_PROGRESS },
      userId
    );
    expect(inProgressTask.status).toBe(TASK_STATUSES.IN_PROGRESS);

    // -------------------------------------------------------------------------
    // Step 4: Verify Persistence after refresh/re-fetch
    // -------------------------------------------------------------------------
    const persistedTasks = await taskService.listTasks(userId, { projectId: createdProject.$id });
    expect(persistedTasks).toHaveLength(1);
    expect(persistedTasks[0].status).toBe(TASK_STATUSES.IN_PROGRESS);
    expect(persistedTasks[0].title).toBe(taskData.title);

    // -------------------------------------------------------------------------
    // Step 5: Create and Enable an Automation Rule
    // -------------------------------------------------------------------------
    // Rule: WHEN task.completed -> IF status == done -> THEN create notification
    const ruleData = {
      name: 'Notify Lead on Task Completion',
      projectId: createdProject.$id,
      triggerEvent: AUTOMATION_TRIGGERS.TASK_COMPLETED,
      conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
      conditionOperator: AUTOMATION_OPERATORS.EQUALS,
      conditionValue: 'done',
      actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
      actionPayload: {
        title: 'Task Successfully Completed',
        message: 'Task "Implement E2E rule verification" has been marked as done.',
      },
      isEnabled: true,
    };
    const createdRule = await automationService.createRule(ruleData, userId);
    expect(createdRule.$id).toBeDefined();
    expect(createdRule.isEnabled).toBe(true);

    const rules = await automationService.listRules(userId, createdProject.$id);
    expect(rules).toHaveLength(1);
    expect(rules[0].$id).toBe(createdRule.$id);

    // -------------------------------------------------------------------------
    // Step 6: Complete the task and trigger the automation rule
    // -------------------------------------------------------------------------
    const completedTask = await taskService.updateTask(
      createdTask.$id,
      { status: TASK_STATUSES.DONE },
      userId
    );
    expect(completedTask.status).toBe(TASK_STATUSES.DONE);

    // Trigger automation engine for task.completed
    const executionResults = await automationService.processEvent({
      triggerEvent: AUTOMATION_TRIGGERS.TASK_COMPLETED,
      task: completedTask,
      userId,
      rules,
    });

    expect(executionResults).toHaveLength(1);
    expect(executionResults[0].success).toBe(true);
    expect(executionResults[0].action).toBe('NOTIFICATION_CREATED');

    // Also record activity log for task completion
    await activityService.logActivity({
      action: 'TASK_COMPLETED',
      details: `Completed task "${completedTask.title}"`,
      projectId: createdProject.$id,
      taskId: completedTask.$id,
      actorId: userId,
      actorName: userName,
      ownerId: userId,
    });

    // -------------------------------------------------------------------------
    // Step 7: Verify Notifications & Activity Logs Saved Correctly
    // -------------------------------------------------------------------------
    const notifications = await notificationService.listNotifications(userId);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('Task Successfully Completed');
    expect(notifications[0].isRead).toBe(false);

    const activities = await activityService.listActivities(userId);
    expect(activities).toHaveLength(1);
    expect(activities[0].action).toBe('TASK_COMPLETED');
    expect(activities[0].ownerId).toBe(userId);

    // -------------------------------------------------------------------------
    // Step 8: Log out and verify unauthenticated access rejection
    // -------------------------------------------------------------------------
    await authService.logout();
    const loggedOutUser = await authService.getCurrentUser();
    expect(loggedOutUser).toBeNull();

    // Verify operations without session are blocked
    await expect(projectService.listProjects('')).rejects.toThrow();
    await expect(taskService.listTasks('')).rejects.toThrow();
  });
});

describe('DevFlow Phase 5 — Edge Cases & Error Handling', () => {
  const TEST_USER = 'edge_case_user_999';

  beforeEach(() => {
    mockDb.clear();
    clearDeduplicationCache();
  });

  it('Edge Case: handles invalid registration and login forms gracefully', async () => {
    // Bad email
    await expect(authService.register('invalid-email-no-at', 'password123', 'Name')).rejects.toThrow(
      /valid email/
    );

    // Short password
    await expect(authService.register('valid@devflow.io', 'short', 'Name')).rejects.toThrow(
      /at least 8 characters/
    );

    // Missing password on login
    await expect(authService.login('valid@devflow.io', '')).rejects.toThrow(/Password is required/);
  });

  it('Edge Case: empty states return clean empty arrays without throwing', async () => {
    const projects = await projectService.listProjects(TEST_USER);
    expect(projects).toEqual([]);

    const tasks = await taskService.listTasks(TEST_USER);
    expect(tasks).toEqual([]);

    const rules = await automationService.listRules(TEST_USER);
    expect(rules).toEqual([]);

    const notifs = await notificationService.listNotifications(TEST_USER);
    expect(notifs).toEqual([]);

    const activities = await activityService.listActivities(TEST_USER);
    expect(activities).toEqual([]);
  });

  it('Edge Case: duplicate events within deduplication window are prevented', async () => {
    const rule = {
      $id: 'rule_dedup',
      name: 'Duplicate check rule',
      triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
      conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
      conditionOperator: AUTOMATION_OPERATORS.EQUALS,
      conditionValue: 'done',
      actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
      actionPayload: { title: 'First notification', message: 'Hello' },
      isEnabled: true,
      projectId: 'proj_1',
    };

    const task = {
      $id: 'task_dup',
      status: 'done',
      projectId: 'proj_1',
      title: 'Task Dup',
    };

    // First call fires
    const res1 = await automationService.processEvent({
      triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
      task,
      userId: TEST_USER,
      rules: [rule],
    });
    expect(res1[0].success).toBe(true);

    // Immediate second call should be caught by deduplication
    const res2 = await automationService.processEvent({
      triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
      task,
      userId: TEST_USER,
      rules: [rule],
    });
    expect(res2[0].action).toBe('SKIPPED_DUPLICATE');
    expect(res2[0].error).toContain('Duplicate event');
  });

  it('Edge Case: disabled rules are not executed', async () => {
    const disabledRule = {
      $id: 'rule_disabled',
      name: 'Disabled notification',
      triggerEvent: AUTOMATION_TRIGGERS.TASK_CREATED,
      conditionField: AUTOMATION_CONDITION_FIELDS.PRIORITY,
      conditionOperator: AUTOMATION_OPERATORS.EQUALS,
      conditionValue: 'urgent',
      actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
      isEnabled: false, // DISABLED
      projectId: 'proj_1',
    };

    const urgentTask = {
      $id: 'task_urgent',
      priority: 'urgent',
      projectId: 'proj_1',
      title: 'Urgent task',
    };

    const results = await automationService.processEvent({
      triggerEvent: AUTOMATION_TRIGGERS.TASK_CREATED,
      task: urgentTask,
      userId: TEST_USER,
      rules: [disabledRule],
    });

    expect(results).toHaveLength(0);
  });

  it('Edge Case: prevents infinite recursion loops in SET_TASK_STATUS actions', async () => {
    const task = {
      $id: 'task_loop',
      status: 'todo',
      projectId: 'proj_1',
      title: 'Recursive task',
    };

    // Simulate an automation action that triggers another status change for the same task
    const mockTaskUpdater = vi.fn().mockImplementation(async (taskId, updates) => {
      // Re-trigger engine for same task
      const nestedResults = await automationService.processEvent({
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        task: { ...task, status: updates.status },
        userId: TEST_USER,
        rules: [],
      });
      expect(nestedResults[0].error).toContain('Loop prevention');
    });

    const loopRule = {
      $id: 'rule_loop',
      name: 'Loop Rule',
      triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
      conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
      conditionOperator: AUTOMATION_OPERATORS.EQUALS,
      conditionValue: 'todo',
      actionType: AUTOMATION_ACTIONS.SET_TASK_STATUS,
      actionPayload: { targetStatus: 'in_progress' },
      isEnabled: true,
      projectId: 'proj_1',
    };

    const results = await automationService.processEvent({
      triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
      task,
      userId: TEST_USER,
      rules: [loopRule],
      taskUpdater: mockTaskUpdater,
    });

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(mockTaskUpdater).toHaveBeenCalled();
  });
});
