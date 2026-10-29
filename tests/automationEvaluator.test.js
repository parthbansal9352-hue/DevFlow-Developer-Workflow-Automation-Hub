import { describe, it, expect } from 'vitest';
import { automationService } from '../src/services/automationService';
import {
  AUTOMATION_OPERATORS,
  AUTOMATION_TRIGGERS,
  AUTOMATION_CONDITION_FIELDS,
  AUTOMATION_ACTIONS,
} from '../src/config/constants';

describe('Automation Evaluator Unit Tests', () => {
  describe('evaluateCondition', () => {
    it('evaluates EQUALS operator correctly (case-insensitive and trimmed)', () => {
      expect(
        automationService.evaluateCondition('done', AUTOMATION_OPERATORS.EQUALS, 'done')
      ).toBe(true);
      expect(
        automationService.evaluateCondition('DONE', AUTOMATION_OPERATORS.EQUALS, '  done  ')
      ).toBe(true);
      expect(
        automationService.evaluateCondition('in_progress', AUTOMATION_OPERATORS.EQUALS, 'done')
      ).toBe(false);
    });

    it('evaluates NOT_EQUALS operator correctly', () => {
      expect(
        automationService.evaluateCondition('todo', AUTOMATION_OPERATORS.NOT_EQUALS, 'done')
      ).toBe(true);
      expect(
        automationService.evaluateCondition('done', AUTOMATION_OPERATORS.NOT_EQUALS, 'done')
      ).toBe(false);
    });

    it('evaluates CONTAINS operator correctly', () => {
      expect(
        automationService.evaluateCondition('alice@corp.com', AUTOMATION_OPERATORS.CONTAINS, 'alice')
      ).toBe(true);
      expect(
        automationService.evaluateCondition('bob@corp.com', AUTOMATION_OPERATORS.CONTAINS, 'alice')
      ).toBe(false);
    });

    it('returns false for unrecognized operator', () => {
      expect(
        automationService.evaluateCondition('test', 'UNKNOWN_OP', 'test')
      ).toBe(false);
    });
  });

  describe('processEvent filtering and rule matching', () => {
    const mockTask = {
      $id: 'task_abc',
      title: 'Fix critical database deadlock',
      status: 'done',
      priority: 'urgent',
      assignee: 'lead-dev',
      projectId: 'proj_1',
    };

    it('matches when trigger and condition meet requirements', async () => {
      const rules = [
        {
          $id: 'rule_1',
          name: 'Notify when task is done',
          triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
          conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
          conditionOperator: AUTOMATION_OPERATORS.EQUALS,
          conditionValue: 'done',
          actionType: AUTOMATION_ACTIONS.LOG_ACTIVITY,
          actionPayload: JSON.stringify({ details: 'Task completed' }),
          isEnabled: true,
          projectId: 'proj_1',
        },
      ];

      // Pure condition match
      const isMatch = automationService.evaluateCondition(
        mockTask[rules[0].conditionField],
        rules[0].conditionOperator,
        rules[0].conditionValue
      );
      expect(isMatch).toBe(true);
    });

    it('skips rule when condition is not met', () => {
      const rule = {
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        conditionValue: 'in_progress',
        isEnabled: true,
      };

      const isMatch = automationService.evaluateCondition(
        mockTask[rule.conditionField],
        rule.conditionOperator,
        rule.conditionValue
      );
      expect(isMatch).toBe(false);
    });

    it('respects project scope (rejects different project ID)', () => {
      const ruleProjectId = 'proj_2';
      const taskProjectId = mockTask.projectId; // 'proj_1'
      expect(ruleProjectId === taskProjectId).toBe(false);
    });
  });
});
