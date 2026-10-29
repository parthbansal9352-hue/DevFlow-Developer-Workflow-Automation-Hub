/**
 * DevFlow Input Validators and Whitelists
 */

import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  PROJECT_STATUSES,
  SUPPORTED_TRIGGERS,
  SUPPORTED_CONDITION_FIELDS,
  SUPPORTED_OPERATORS,
  SUPPORTED_ACTIONS,
} from '../config/constants';

export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

export function isValidTaskStatus(status) {
  return Object.values(TASK_STATUSES).includes(status);
}

export function isValidTaskPriority(priority) {
  return Object.values(TASK_PRIORITIES).includes(priority);
}

export function isValidProjectStatus(status) {
  return Object.values(PROJECT_STATUSES).includes(status);
}

export function validateProjectInput(data, isUpdate = false) {
  const errors = {};
  if (!isUpdate || data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.name = 'Project name is required';
    } else if (data.name.trim().length > 128) {
      errors.name = 'Project name cannot exceed 128 characters';
    }
  }

  if (data.description && typeof data.description === 'string' && data.description.length > 500) {
    errors.description = 'Description cannot exceed 500 characters';
  }

  if (data.status && !isValidProjectStatus(data.status)) {
    errors.status = 'Invalid project status';
  }

  if (data.githubRepo && typeof data.githubRepo === 'string') {
    const trimmed = data.githubRepo.trim();
    if (trimmed.length > 128) {
      errors.githubRepo = 'GitHub repository cannot exceed 128 characters';
    } else if (trimmed && !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      errors.githubRepo = 'GitHub repository must be in owner/repo format';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateTaskInput(data) {
  const errors = {};
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.title = 'Task title is required';
  } else if (data.title.trim().length > 255) {
    errors.title = 'Task title cannot exceed 255 characters';
  }

  if (!data.projectId || typeof data.projectId !== 'string') {
    errors.projectId = 'Project ID is required';
  }

  if (data.status && !isValidTaskStatus(data.status)) {
    errors.status = `Status must be one of: ${Object.values(TASK_STATUSES).join(', ')}`;
  }

  if (data.priority && !isValidTaskPriority(data.priority)) {
    errors.priority = `Priority must be one of: ${Object.values(TASK_PRIORITIES).join(', ')}`;
  }

  if (data.description && typeof data.description === 'string' && data.description.length > 2000) {
    errors.description = 'Description cannot exceed 2000 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates automation rule input against allowlists.
 * Prevents creation of rules with unsupported triggers, operators, or actions.
 */
export function validateAutomationRuleInput(rule) {
  const errors = {};
  if (!rule.name || typeof rule.name !== 'string' || rule.name.trim().length === 0) {
    errors.name = 'Rule name is required';
  } else if (rule.name.trim().length > 128) {
    errors.name = 'Rule name cannot exceed 128 characters';
  }

  if (!rule.triggerEvent || !SUPPORTED_TRIGGERS.has(rule.triggerEvent)) {
    errors.triggerEvent = `Invalid trigger event. Must be one of: ${[...SUPPORTED_TRIGGERS].join(', ')}`;
  }

  if (!rule.conditionField || !SUPPORTED_CONDITION_FIELDS.has(rule.conditionField)) {
    errors.conditionField = `Invalid condition field. Must be one of: ${[...SUPPORTED_CONDITION_FIELDS].join(', ')}`;
  }

  if (!rule.conditionOperator || !SUPPORTED_OPERATORS.has(rule.conditionOperator)) {
    errors.conditionOperator = `Invalid condition operator. Must be one of: ${[...SUPPORTED_OPERATORS].join(', ')}`;
  }

  if (rule.conditionValue && typeof rule.conditionValue === 'string' && rule.conditionValue.length > 255) {
    errors.conditionValue = 'Condition value cannot exceed 255 characters';
  }

  if (!rule.actionType || !SUPPORTED_ACTIONS.has(rule.actionType)) {
    errors.actionType = `Invalid action type. Must be one of: ${[...SUPPORTED_ACTIONS].join(', ')}`;
  }

  // Extra validation for SET_TASK_STATUS: must have a valid targetStatus in payload
  if (rule.actionType === 'SET_TASK_STATUS') {
    let payload = {};
    try {
      payload = typeof rule.actionPayload === 'string'
        ? JSON.parse(rule.actionPayload)
        : (rule.actionPayload || {});
    } catch {
      // ignore parse errors here; will be caught at execution time
    }
    if (payload.targetStatus && !isValidTaskStatus(payload.targetStatus)) {
      errors.actionPayload = `Invalid target status. Must be one of: ${Object.values(TASK_STATUSES).join(', ')}`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
