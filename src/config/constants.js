/**
 * DevFlow Core Constants & Enums
 */

export const TASK_STATUSES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  DONE: 'done',
};

export const TASK_STATUS_LIST = [
  { value: TASK_STATUSES.TODO, label: 'To Do', color: 'bg-slate-700 text-slate-200 border-slate-600' },
  { value: TASK_STATUSES.IN_PROGRESS, label: 'In Progress', color: 'bg-blue-900/60 text-blue-300 border-blue-700/60' },
  { value: TASK_STATUSES.IN_REVIEW, label: 'In Review', color: 'bg-purple-900/60 text-purple-300 border-purple-700/60' },
  { value: TASK_STATUSES.DONE, label: 'Done', color: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60' },
];

export const TASK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const TASK_PRIORITY_LIST = [
  { value: TASK_PRIORITIES.LOW, label: 'Low', badgeColor: 'bg-slate-800 text-slate-300 border-slate-700' },
  { value: TASK_PRIORITIES.MEDIUM, label: 'Medium', badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60' },
  { value: TASK_PRIORITIES.HIGH, label: 'High', badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-800/60' },
  { value: TASK_PRIORITIES.URGENT, label: 'Urgent', badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-800/60' },
];

export const PROJECT_STATUSES = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  COMPLETED: 'completed',
};

/**
 * Supported automation trigger events.
 * These are the ONLY events the engine will process.
 */
export const AUTOMATION_TRIGGERS = {
  TASK_CREATED: 'task.created',
  TASK_STATUS_CHANGED: 'task.status_changed',
  TASK_COMPLETED: 'task.completed',
};

/** Human-readable labels for triggers */
export const AUTOMATION_TRIGGER_LABELS = {
  [AUTOMATION_TRIGGERS.TASK_CREATED]: 'Task Created',
  [AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED]: 'Task Status Changed',
  [AUTOMATION_TRIGGERS.TASK_COMPLETED]: 'Task Completed',
};

export const AUTOMATION_CONDITION_FIELDS = {
  STATUS: 'status',
  PRIORITY: 'priority',
  ASSIGNEE: 'assignee',
};

export const AUTOMATION_OPERATORS = {
  EQUALS: 'EQUALS',
  NOT_EQUALS: 'NOT_EQUALS',
  CONTAINS: 'CONTAINS',
};

/**
 * Supported automation action types.
 * These are the ONLY actions the engine will execute.
 * No arbitrary code execution is permitted.
 */
export const AUTOMATION_ACTIONS = {
  CREATE_NOTIFICATION: 'CREATE_NOTIFICATION',
  LOG_ACTIVITY: 'LOG_ACTIVITY',
  SET_TASK_STATUS: 'SET_TASK_STATUS',
};

/** Human-readable labels for actions */
export const AUTOMATION_ACTION_LABELS = {
  [AUTOMATION_ACTIONS.CREATE_NOTIFICATION]: 'Create In-App Notification',
  [AUTOMATION_ACTIONS.LOG_ACTIVITY]: 'Write Activity Audit Log',
  [AUTOMATION_ACTIONS.SET_TASK_STATUS]: 'Update Task Status',
};

export const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  SUCCESS: 'success',
  ALERT: 'alert',
};

/**
 * Allowlist sets for fast membership checks in the engine.
 */
export const SUPPORTED_TRIGGERS = new Set(Object.values(AUTOMATION_TRIGGERS));
export const SUPPORTED_ACTIONS = new Set(Object.values(AUTOMATION_ACTIONS));
export const SUPPORTED_CONDITION_FIELDS = new Set(Object.values(AUTOMATION_CONDITION_FIELDS));
export const SUPPORTED_OPERATORS = new Set(Object.values(AUTOMATION_OPERATORS));
