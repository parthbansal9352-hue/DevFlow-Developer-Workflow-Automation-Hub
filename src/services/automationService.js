/**
 * DevFlow Automation Rule Service & Execution Engine
 *
 * Centralized, testable rule-based engine that:
 * - Validates triggers and actions against allowlists
 * - Prevents infinite loops via a per-processEvent recursion guard
 * - Deduplicates rapid identical events via fingerprinting
 * - Never executes arbitrary user-supplied code
 *
 * ## Idempotency Strategy
 * We use an in-memory fingerprint cache keyed by `ruleId:taskId:triggerEvent:conditionSnapshot`.
 * Within the DEDUPLICATION_WINDOW_MS (5 seconds), a rule+task+state combination will only fire once.
 * This is a best-effort client-side strategy. For guaranteed exactly-once processing,
 * an Appwrite Function with a server-side deduplication table would be required.
 *
 * ## Loop Prevention
 * When a SET_TASK_STATUS action updates a task, it may re-trigger task.status_changed.
 * The engine tracks recursion depth with MAX_RECURSION_DEPTH=1. If processEvent is
 * already executing for the same task, the nested call is skipped entirely.
 */

import { APPWRITE_CONFIG, ID, Query } from '../config/appwrite';
import { dbAdapter } from './dbAdapter';
import { buildOwnerPermissions } from '../utils/permissions';
import { validateAutomationRuleInput } from '../utils/validators';
import { notificationService } from './notificationService';
import { activityService } from './activityService';
import {
  AUTOMATION_TRIGGERS,
  AUTOMATION_OPERATORS,
  AUTOMATION_ACTIONS,
  NOTIFICATION_TYPES,
  TASK_STATUSES,
  SUPPORTED_TRIGGERS,
  SUPPORTED_ACTIONS,
  SUPPORTED_CONDITION_FIELDS,
  SUPPORTED_OPERATORS,
} from '../config/constants';

const TABLE_AUTOMATION_RULES = APPWRITE_CONFIG.tables.automationRules;

// ---------------------------------------------------------------------------
// Deduplication cache: fingerprint -> timestamp
// ---------------------------------------------------------------------------
const executedRuleFingerprints = new Map();
const DEDUPLICATION_WINDOW_MS = 5000;

/** Exposed for testing: clear deduplication cache */
export function clearDeduplicationCache() {
  executedRuleFingerprints.clear();
}

// ---------------------------------------------------------------------------
// Loop-prevention: tracks tasks currently being processed
// ---------------------------------------------------------------------------
const activeProcessingTasks = new Set();
const MAX_RECURSION_DEPTH = 1; // No nested re-entrant calls allowed

export const automationService = {
  /**
   * List all automation rules for a user.
   * @param {string} userId
   * @param {string} [projectId]
   */
  async listRules(userId, projectId = '') {
    if (!userId) return [];

    try {
      const queries = [
        Query.equal('ownerId', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ];

      const res = await dbAdapter.list(TABLE_AUTOMATION_RULES, queries);
      let rules = res.items;

      if (projectId) {
        rules = rules.filter((r) => !r.projectId || r.projectId === projectId);
      }
      return rules;
    } catch (err) {
      console.warn('Failed to list automation rules:', err.message);
      return [];
    }
  },

  /**
   * Create a new automation rule.
   * @param {object} ruleData
   * @param {string} userId
   */
  async createRule(ruleData, userId) {
    if (!userId) throw new Error('User ID is required to create a rule.');

    const validation = validateAutomationRuleInput(ruleData);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      throw new Error(firstError);
    }

    const ruleId = ID.unique();
    const permissions = buildOwnerPermissions(userId);

    const payload = {
      name: ruleData.name.trim(),
      projectId: ruleData.projectId || '',
      triggerEvent: ruleData.triggerEvent,
      conditionField: ruleData.conditionField,
      conditionOperator: ruleData.conditionOperator,
      conditionValue: (ruleData.conditionValue || '').trim(),
      actionType: ruleData.actionType,
      actionPayload: typeof ruleData.actionPayload === 'object'
        ? JSON.stringify(ruleData.actionPayload)
        : (ruleData.actionPayload || '{}'),
      isEnabled: ruleData.isEnabled !== false,
      ownerId: userId,
    };

    return await dbAdapter.create(TABLE_AUTOMATION_RULES, ruleId, payload, permissions);
  },

  /**
   * Update an existing rule (e.g. toggle enabled state).
   * @param {string} ruleId
   * @param {object} updates
   */
  async updateRule(ruleId, updates) {
    if (!ruleId) throw new Error('Rule ID is required.');
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.isEnabled !== undefined) payload.isEnabled = Boolean(updates.isEnabled);
    if (updates.triggerEvent !== undefined) payload.triggerEvent = updates.triggerEvent;
    if (updates.conditionField !== undefined) payload.conditionField = updates.conditionField;
    if (updates.conditionOperator !== undefined) payload.conditionOperator = updates.conditionOperator;
    if (updates.conditionValue !== undefined) payload.conditionValue = updates.conditionValue.trim();
    if (updates.actionType !== undefined) payload.actionType = updates.actionType;
    if (updates.actionPayload !== undefined) {
      payload.actionPayload = typeof updates.actionPayload === 'object'
        ? JSON.stringify(updates.actionPayload)
        : updates.actionPayload;
    }

    return await dbAdapter.update(TABLE_AUTOMATION_RULES, ruleId, payload);
  },

  /**
   * Delete an automation rule.
   * @param {string} ruleId
   */
  async deleteRule(ruleId) {
    if (!ruleId) throw new Error('Rule ID is required.');
    return await dbAdapter.delete(TABLE_AUTOMATION_RULES, ruleId);
  },

  /**
   * Evaluate a condition against a target value.
   * Pure evaluation function — no side effects, fully testable.
   * @param {string} actualValue
   * @param {string} operator
   * @param {string} expectedValue
   * @returns {boolean}
   */
  evaluateCondition(actualValue, operator, expectedValue) {
    // Reject unsupported operators
    if (!SUPPORTED_OPERATORS.has(operator)) {
      return false;
    }

    const act = (actualValue || '').toString().toLowerCase().trim();
    const exp = (expectedValue || '').toString().toLowerCase().trim();

    switch (operator) {
      case AUTOMATION_OPERATORS.EQUALS:
        return act === exp;
      case AUTOMATION_OPERATORS.NOT_EQUALS:
        return act !== exp;
      case AUTOMATION_OPERATORS.CONTAINS:
        return act.includes(exp);
      default:
        return false;
    }
  },

  /**
   * Validate that a trigger event is in the supported allowlist.
   * @param {string} triggerEvent
   * @returns {boolean}
   */
  isSupportedTrigger(triggerEvent) {
    return SUPPORTED_TRIGGERS.has(triggerEvent);
  },

  /**
   * Validate that an action type is in the supported allowlist.
   * @param {string} actionType
   * @returns {boolean}
   */
  isSupportedAction(actionType) {
    return SUPPORTED_ACTIONS.has(actionType);
  },

  /**
   * Generate a deduplication fingerprint for a rule execution.
   * @param {object} rule
   * @param {object} task
   * @param {string} triggerEvent
   * @returns {string}
   */
  buildFingerprint(rule, task, triggerEvent) {
    const ruleKey = rule.$id || rule.name || 'unknown';
    const taskKey = task.$id || 'unknown';
    const condSnapshot = `${task[rule.conditionField] || ''}`;
    return `${ruleKey}:${taskKey}:${triggerEvent}:${condSnapshot}`;
  },

  /**
   * Check if an event fingerprint is within the deduplication window.
   * @param {string} fingerprint
   * @returns {boolean} true if duplicate (should skip)
   */
  isDuplicate(fingerprint) {
    const lastExec = executedRuleFingerprints.get(fingerprint);
    if (!lastExec) return false;
    return (Date.now() - lastExec) < DEDUPLICATION_WINDOW_MS;
  },

  /**
   * Execute a single validated action for a matched rule.
   * Returns a result object describing what happened.
   *
   * @param {object} rule - The matched automation rule
   * @param {object} task - The task that triggered the event
   * @param {object} payload - Parsed actionPayload
   * @param {string} userId - Owner user ID
   * @param {Function} [taskUpdater] - Optional callback for updating tasks (SET_TASK_STATUS)
   * @returns {Promise<{ruleId: string, action: string, success: boolean, error?: string}>}
   */
  async executeAction(rule, task, payload, userId, taskUpdater = null) {
    const result = { ruleId: rule.$id || rule.name, ruleName: rule.name, success: false };

    // Validate action against allowlist
    if (!this.isSupportedAction(rule.actionType)) {
      result.action = rule.actionType;
      result.error = `Unsupported action type: ${rule.actionType}`;
      return result;
    }

    try {
      if (rule.actionType === AUTOMATION_ACTIONS.CREATE_NOTIFICATION) {
        const title = payload.title || `Automation: ${rule.name}`;
        const message = payload.message || `Task "${task.title}" triggered rule "${rule.name}" (${rule.conditionField} is ${task[rule.conditionField]}).`;
        await notificationService.createNotification({
          userId,
          title,
          message,
          type: payload.type || NOTIFICATION_TYPES.INFO,
          link: `/tasks?projectId=${task.projectId}`,
        });
        result.action = 'NOTIFICATION_CREATED';
        result.success = true;

      } else if (rule.actionType === AUTOMATION_ACTIONS.LOG_ACTIVITY) {
        const details = payload.details || `Rule "${rule.name}" executed for task "${task.title}".`;
        await activityService.logActivity({
          action: 'AUTOMATION_EXECUTED',
          details,
          projectId: task.projectId,
          taskId: task.$id,
          actorId: userId,
          actorName: 'Automation Engine',
          ownerId: userId,
        });
        result.action = 'ACTIVITY_LOGGED';
        result.success = true;

      } else if (rule.actionType === AUTOMATION_ACTIONS.SET_TASK_STATUS) {
        const targetStatus = payload.targetStatus;
        if (!targetStatus || !Object.values(TASK_STATUSES).includes(targetStatus)) {
          result.action = 'SET_TASK_STATUS';
          result.error = `Invalid target status: ${targetStatus}`;
          return result;
        }

        // Don't update if already in target status
        if (task.status === targetStatus) {
          result.action = 'SET_TASK_STATUS';
          result.error = 'Task already in target status — skipped';
          result.success = true; // Not a failure, just a no-op
          return result;
        }

        if (taskUpdater) {
          await taskUpdater(task.$id, { status: targetStatus });
        } else {
          // Direct update via dbAdapter (used in testing or standalone contexts)
          const TABLE_TASKS = APPWRITE_CONFIG.tables.tasks;
          await dbAdapter.update(TABLE_TASKS, task.$id, { status: targetStatus });
        }

        // Log the automated status change
        await activityService.logActivity({
          action: 'AUTOMATION_SET_STATUS',
          details: `Rule "${rule.name}" changed task "${task.title}" status from "${task.status}" to "${targetStatus}".`,
          projectId: task.projectId,
          taskId: task.$id,
          actorId: userId,
          actorName: 'Automation Engine',
          ownerId: userId,
        });

        result.action = 'TASK_STATUS_UPDATED';
        result.success = true;
      }
    } catch (execErr) {
      result.action = rule.actionType;
      result.error = execErr.message;
    }

    return result;
  },

  /**
   * Evaluate and execute all matching active automation rules for a given event.
   *
   * @param {object} context
   * @param {string} context.triggerEvent - e.g. task.created, task.status_changed, task.completed
   * @param {object} context.task - current task object
   * @param {object} [context.previousTask] - previous task state (for change events)
   * @param {string} context.userId - owner user ID
   * @param {string} context.userName - actor name
   * @param {Array} [context.rules] - optional pre-loaded rules (or fetches live from db)
   * @param {Function} [context.taskUpdater] - optional callback for SET_TASK_STATUS action
   * @returns {Promise<Array<{ruleId: string, action: string, success: boolean, error?: string}>>}
   */
  async processEvent({ triggerEvent, task, previousTask = null, userId, userName, rules = null, taskUpdater = null }) {
    if (!triggerEvent || !task || !userId) return [];

    // Validate trigger against allowlist
    if (!this.isSupportedTrigger(triggerEvent)) {
      console.warn(`Unsupported trigger event: ${triggerEvent}`);
      return [];
    }

    // Loop prevention: skip if we're already processing this task
    const loopKey = `${task.$id}:${triggerEvent}`;
    if (activeProcessingTasks.has(loopKey)) {
      console.warn(`Loop prevention: skipping re-entrant processing for task ${task.$id} trigger ${triggerEvent}`);
      return [{ ruleId: 'LOOP_GUARD', action: 'SKIPPED', success: false, error: 'Loop prevention: re-entrant call blocked' }];
    }

    activeProcessingTasks.add(loopKey);

    try {
      let activeRules = rules;
      if (!activeRules) {
        activeRules = await this.listRules(userId, task.projectId);
      }

      const executedActions = [];

      for (const rule of activeRules) {
        // Skip disabled rules
        if (!rule.isEnabled) continue;

        // Skip if trigger doesn't match
        if (rule.triggerEvent !== triggerEvent) continue;

        // Skip unsupported actions
        if (!this.isSupportedAction(rule.actionType)) {
          executedActions.push({
            ruleId: rule.$id || rule.name,
            action: rule.actionType,
            success: false,
            error: `Unsupported action: ${rule.actionType}`,
          });
          continue;
        }

        // Project scope check: rule applies if rule.projectId is empty (global) or matches
        if (rule.projectId && rule.projectId !== task.projectId) continue;

        // Validate condition field
        if (!SUPPORTED_CONDITION_FIELDS.has(rule.conditionField)) continue;

        // Deduplication check
        const fingerprint = this.buildFingerprint(rule, task, triggerEvent);
        if (this.isDuplicate(fingerprint)) {
          executedActions.push({
            ruleId: rule.$id || rule.name,
            action: 'SKIPPED_DUPLICATE',
            success: false,
            error: 'Duplicate event within deduplication window',
          });
          continue;
        }

        // Evaluate condition
        const actualValue = task[rule.conditionField];
        const matches = this.evaluateCondition(actualValue, rule.conditionOperator, rule.conditionValue);

        if (!matches) continue;

        // Mark fingerprint before execution
        executedRuleFingerprints.set(fingerprint, Date.now());

        // Parse action payload
        let payload = {};
        try {
          payload = typeof rule.actionPayload === 'string'
            ? JSON.parse(rule.actionPayload)
            : (rule.actionPayload || {});
        } catch {
          payload = {};
        }

        // Execute the action
        const result = await this.executeAction(rule, task, payload, userId, taskUpdater);
        executedActions.push(result);
      }

      return executedActions;
    } finally {
      activeProcessingTasks.delete(loopKey);
    }
  },

  /**
   * Convenience: fire both task.status_changed and task.completed (if applicable).
   * Called from ProjectContext when a task status changes.
   */
  async processStatusChange(context) {
    const results = [];

    // Always fire task.status_changed
    const statusResults = await this.processEvent({
      ...context,
      triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
    });
    results.push(...statusResults);

    // Also fire task.completed if new status is 'done'
    if (context.task && context.task.status === TASK_STATUSES.DONE) {
      const completedResults = await this.processEvent({
        ...context,
        triggerEvent: AUTOMATION_TRIGGERS.TASK_COMPLETED,
      });
      results.push(...completedResults);
    }

    return results;
  },
};
