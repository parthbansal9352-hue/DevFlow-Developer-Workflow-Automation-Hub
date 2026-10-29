import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidPassword,
  isValidTaskStatus,
  isValidTaskPriority,
  isValidProjectStatus,
  validateProjectInput,
  validateTaskInput,
  validateAutomationRuleInput,
} from '../src/utils/validators';
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  PROJECT_STATUSES,
  AUTOMATION_TRIGGERS,
  AUTOMATION_CONDITION_FIELDS,
  AUTOMATION_OPERATORS,
  AUTOMATION_ACTIONS,
} from '../src/config/constants';

describe('Validators Unit Tests', () => {
  describe('Email & Password Validation', () => {
    it('validates correct email formats', () => {
      expect(isValidEmail('developer@devflow.io')).toBe(true);
      expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    it('rejects invalid email formats', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('plainaddress')).toBe(false);
      expect(isValidEmail('@missinguser.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
      expect(isValidEmail(12345)).toBe(false);
    });

    it('enforces minimum 8-character and maximum 128-character password', () => {
      expect(isValidPassword('short')).toBe(false);
      expect(isValidPassword('1234567')).toBe(false);
      expect(isValidPassword('12345678')).toBe(true);
      expect(isValidPassword('strong_secure_pass_123!')).toBe(true);
      expect(isValidPassword('a'.repeat(128))).toBe(true);
      expect(isValidPassword('a'.repeat(129))).toBe(false);
      expect(isValidPassword(null)).toBe(false);
      expect(isValidPassword(undefined)).toBe(false);
    });
  });

  describe('Whitelist Validations', () => {
    it('validates task statuses against whitelist', () => {
      expect(isValidTaskStatus(TASK_STATUSES.TODO)).toBe(true);
      expect(isValidTaskStatus(TASK_STATUSES.IN_PROGRESS)).toBe(true);
      expect(isValidTaskStatus(TASK_STATUSES.IN_REVIEW)).toBe(true);
      expect(isValidTaskStatus(TASK_STATUSES.DONE)).toBe(true);
      expect(isValidTaskStatus('unknown_status')).toBe(false);
      expect(isValidTaskStatus('')).toBe(false);
      expect(isValidTaskStatus(null)).toBe(false);
    });

    it('validates task priorities against whitelist', () => {
      expect(isValidTaskPriority(TASK_PRIORITIES.LOW)).toBe(true);
      expect(isValidTaskPriority(TASK_PRIORITIES.MEDIUM)).toBe(true);
      expect(isValidTaskPriority(TASK_PRIORITIES.HIGH)).toBe(true);
      expect(isValidTaskPriority(TASK_PRIORITIES.URGENT)).toBe(true);
      expect(isValidTaskPriority('critical_unsupported')).toBe(false);
      expect(isValidTaskPriority('')).toBe(false);
      expect(isValidTaskPriority(null)).toBe(false);
    });

    it('validates project statuses against whitelist', () => {
      expect(isValidProjectStatus(PROJECT_STATUSES.ACTIVE)).toBe(true);
      expect(isValidProjectStatus(PROJECT_STATUSES.ARCHIVED)).toBe(true);
      expect(isValidProjectStatus('deleted')).toBe(false);
      expect(isValidProjectStatus('')).toBe(false);
      expect(isValidProjectStatus(null)).toBe(false);
    });
  });

  describe('Project Input Validation', () => {
    it('passes for valid project data', () => {
      const res = validateProjectInput({
        name: 'Backend API',
        description: 'Microservice endpoints',
        status: PROJECT_STATUSES.ACTIVE,
      });
      expect(res.isValid).toBe(true);
      expect(res.errors).toEqual({});
    });

    it('fails when project name is missing or empty', () => {
      const res = validateProjectInput({ name: '   ' });
      expect(res.isValid).toBe(false);
      expect(res.errors.name).toBeDefined();
    });

    it('fails when name exceeds 128 characters', () => {
      const longName = 'a'.repeat(129);
      const res = validateProjectInput({ name: longName });
      expect(res.isValid).toBe(false);
      expect(res.errors.name).toContain('128');
    });

    it('fails when description exceeds 500 characters', () => {
      const res = validateProjectInput({
        name: 'Valid Project',
        description: 'a'.repeat(501),
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.description).toContain('500');
    });

    it('fails when status is invalid', () => {
      const res = validateProjectInput({
        name: 'Valid Project',
        status: 'invalid_status',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.status).toBeDefined();
    });
  });

  describe('Task Input Validation', () => {
    it('passes for valid task data', () => {
      const res = validateTaskInput({
        title: 'Fix authentication token expiry',
        projectId: 'proj_123',
        status: TASK_STATUSES.IN_PROGRESS,
        priority: TASK_PRIORITIES.HIGH,
      });
      expect(res.isValid).toBe(true);
    });

    it('fails when title or projectId are missing', () => {
      const res = validateTaskInput({ title: '' });
      expect(res.isValid).toBe(false);
      expect(res.errors.title).toBeDefined();
      expect(res.errors.projectId).toBeDefined();
    });

    it('fails when title exceeds 255 characters', () => {
      const res = validateTaskInput({
        title: 'x'.repeat(256),
        projectId: 'proj_123',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.title).toContain('255');
    });

    it('fails when invalid status is provided', () => {
      const res = validateTaskInput({
        title: 'Valid title',
        projectId: 'proj_123',
        status: 'invalid_status_xyz',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.status).toBeDefined();
    });

    it('fails when invalid priority is provided', () => {
      const res = validateTaskInput({
        title: 'Valid title',
        projectId: 'proj_123',
        priority: 'super_high',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.priority).toBeDefined();
    });

    it('fails when description exceeds 2000 characters', () => {
      const res = validateTaskInput({
        title: 'Valid title',
        projectId: 'proj_123',
        description: 'a'.repeat(2001),
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.description).toContain('2000');
    });
  });

  describe('Automation Rule Input Validation', () => {
    it('passes for valid automation rule configurations for all supported triggers', () => {
      for (const trigger of [
        AUTOMATION_TRIGGERS.TASK_CREATED,
        AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        AUTOMATION_TRIGGERS.TASK_COMPLETED,
      ]) {
        const res = validateAutomationRuleInput({
          name: 'Rule for ' + trigger,
          triggerEvent: trigger,
          conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
          conditionOperator: AUTOMATION_OPERATORS.EQUALS,
          conditionValue: 'done',
          actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
        });
        expect(res.isValid).toBe(true);
      }
    });

    it('fails when an unsupported trigger event is supplied', () => {
      const res = validateAutomationRuleInput({
        name: 'Broken Rule',
        triggerEvent: 'TASK_DELETED_UNSUPPORTED',
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.triggerEvent).toBeDefined();
    });

    it('fails when rule name is empty or too long', () => {
      const emptyRes = validateAutomationRuleInput({
        name: '   ',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_CREATED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
      });
      expect(emptyRes.isValid).toBe(false);
      expect(emptyRes.errors.name).toBeDefined();

      const longRes = validateAutomationRuleInput({
        name: 'a'.repeat(129),
        triggerEvent: AUTOMATION_TRIGGERS.TASK_CREATED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
      });
      expect(longRes.isValid).toBe(false);
      expect(longRes.errors.name).toContain('128');
    });

    it('fails when unsupported condition field or operator is supplied', () => {
      const fieldRes = validateAutomationRuleInput({
        name: 'Bad Field Rule',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_CREATED,
        conditionField: 'unsupported_field',
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
      });
      expect(fieldRes.isValid).toBe(false);
      expect(fieldRes.errors.conditionField).toBeDefined();

      const opRes = validateAutomationRuleInput({
        name: 'Bad Operator Rule',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_CREATED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: 'REGEX_MATCH',
        actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
      });
      expect(opRes.isValid).toBe(false);
      expect(opRes.errors.conditionOperator).toBeDefined();
    });

    it('fails when unsupported action type is supplied', () => {
      const res = validateAutomationRuleInput({
        name: 'Unsupported Action Rule',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_CREATED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        actionType: 'EXECUTE_RAW_SCRIPT',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.actionType).toBeDefined();
    });

    it('validates SET_TASK_STATUS targetStatus in actionPayload', () => {
      const validRes = validateAutomationRuleInput({
        name: 'Move to Review',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        actionType: AUTOMATION_ACTIONS.SET_TASK_STATUS,
        actionPayload: JSON.stringify({ targetStatus: TASK_STATUSES.IN_REVIEW }),
      });
      expect(validRes.isValid).toBe(true);

      const invalidRes = validateAutomationRuleInput({
        name: 'Move to Unknown',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        actionType: AUTOMATION_ACTIONS.SET_TASK_STATUS,
        actionPayload: JSON.stringify({ targetStatus: 'invalid_status_val' }),
      });
      expect(invalidRes.isValid).toBe(false);
      expect(invalidRes.errors.actionPayload).toBeDefined();
    });

    it('fails when conditionValue exceeds 255 characters', () => {
      const res = validateAutomationRuleInput({
        name: 'Long Value Rule',
        triggerEvent: AUTOMATION_TRIGGERS.TASK_CREATED,
        conditionField: AUTOMATION_CONDITION_FIELDS.STATUS,
        conditionOperator: AUTOMATION_OPERATORS.EQUALS,
        conditionValue: 'x'.repeat(256),
        actionType: AUTOMATION_ACTIONS.CREATE_NOTIFICATION,
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.conditionValue).toContain('255');
    });
  });
});
