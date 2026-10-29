import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import {
  AUTOMATION_TRIGGERS,
  AUTOMATION_TRIGGER_LABELS,
  AUTOMATION_CONDITION_FIELDS,
  AUTOMATION_OPERATORS,
  AUTOMATION_ACTIONS,
  AUTOMATION_ACTION_LABELS,
  TASK_STATUS_LIST,
  TASK_PRIORITY_LIST,
  TASK_STATUSES,
} from '../../config/constants';
import { useProjects } from '../../context/ProjectContext';

const TRIGGER_OPTIONS = [
  { value: AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED, label: AUTOMATION_TRIGGER_LABELS[AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED] },
  { value: AUTOMATION_TRIGGERS.TASK_CREATED, label: AUTOMATION_TRIGGER_LABELS[AUTOMATION_TRIGGERS.TASK_CREATED] },
  { value: AUTOMATION_TRIGGERS.TASK_COMPLETED, label: AUTOMATION_TRIGGER_LABELS[AUTOMATION_TRIGGERS.TASK_COMPLETED] },
];

const CONDITION_FIELD_OPTIONS = [
  { value: AUTOMATION_CONDITION_FIELDS.STATUS, label: 'Status' },
  { value: AUTOMATION_CONDITION_FIELDS.PRIORITY, label: 'Priority' },
  { value: AUTOMATION_CONDITION_FIELDS.ASSIGNEE, label: 'Assignee' },
];

const OPERATOR_OPTIONS = [
  { value: AUTOMATION_OPERATORS.EQUALS, label: 'Equals' },
  { value: AUTOMATION_OPERATORS.NOT_EQUALS, label: 'Does not equal' },
  { value: AUTOMATION_OPERATORS.CONTAINS, label: 'Contains' },
];

const ACTION_OPTIONS = [
  { value: AUTOMATION_ACTIONS.CREATE_NOTIFICATION, label: AUTOMATION_ACTION_LABELS[AUTOMATION_ACTIONS.CREATE_NOTIFICATION] },
  { value: AUTOMATION_ACTIONS.LOG_ACTIVITY, label: AUTOMATION_ACTION_LABELS[AUTOMATION_ACTIONS.LOG_ACTIVITY] },
  { value: AUTOMATION_ACTIONS.SET_TASK_STATUS, label: AUTOMATION_ACTION_LABELS[AUTOMATION_ACTIONS.SET_TASK_STATUS] },
];

const TARGET_STATUS_OPTIONS = TASK_STATUS_LIST.map((s) => ({ value: s.value, label: s.label }));

/**
 * Dynamic helper options for the condition value field based on selected condition field.
 */
function getConditionValueHint(conditionField) {
  if (conditionField === AUTOMATION_CONDITION_FIELDS.STATUS) {
    return TASK_STATUS_LIST.map((s) => s.value).join(', ');
  }
  if (conditionField === AUTOMATION_CONDITION_FIELDS.PRIORITY) {
    return TASK_PRIORITY_LIST.map((p) => p.value).join(', ');
  }
  return 'any text value';
}

export function RuleModal({ isOpen, onClose, onSubmit, initialData = null }) {
  const { projects, activeProjectId } = useProjects();
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [triggerEvent, setTriggerEvent] = useState(AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED);
  const [conditionField, setConditionField] = useState(AUTOMATION_CONDITION_FIELDS.STATUS);
  const [conditionOperator, setConditionOperator] = useState(AUTOMATION_OPERATORS.EQUALS);
  const [conditionValue, setConditionValue] = useState('done');
  const [actionType, setActionType] = useState(AUTOMATION_ACTIONS.CREATE_NOTIFICATION);
  const [actionTitle, setActionTitle] = useState('Task Completed');
  const [actionMessage, setActionMessage] = useState('A task was marked as completed.');
  const [targetStatus, setTargetStatus] = useState(TASK_STATUSES.IN_PROGRESS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setProjectId(initialData.projectId || '');
      setTriggerEvent(initialData.triggerEvent || AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED);
      setConditionField(initialData.conditionField || AUTOMATION_CONDITION_FIELDS.STATUS);
      setConditionOperator(initialData.conditionOperator || AUTOMATION_OPERATORS.EQUALS);
      setConditionValue(initialData.conditionValue || 'done');
      setActionType(initialData.actionType || AUTOMATION_ACTIONS.CREATE_NOTIFICATION);

      let payload = {};
      try {
        payload = typeof initialData.actionPayload === 'string'
          ? JSON.parse(initialData.actionPayload)
          : (initialData.actionPayload || {});
      } catch {
        payload = {};
      }
      setActionTitle(payload.title || 'Automation Notification');
      setActionMessage(payload.message || payload.details || 'Automation condition triggered.');
      setTargetStatus(payload.targetStatus || TASK_STATUSES.IN_PROGRESS);
    } else {
      setName('');
      setProjectId(activeProjectId || '');
      setTriggerEvent(AUTOMATION_TRIGGERS.TASK_STATUS_CHANGED);
      setConditionField(AUTOMATION_CONDITION_FIELDS.STATUS);
      setConditionOperator(AUTOMATION_OPERATORS.EQUALS);
      setConditionValue('done');
      setActionType(AUTOMATION_ACTIONS.CREATE_NOTIFICATION);
      setActionTitle('Task Done Alert');
      setActionMessage('Task moved to completed status.');
      setTargetStatus(TASK_STATUSES.IN_PROGRESS);
    }
    setError(null);
    setFieldErrors({});
  }, [initialData, isOpen, activeProjectId]);

  const validate = () => {
    const errors = {};
    if (!name.trim()) errors.name = 'Rule name is required.';
    if (name.trim().length > 128) errors.name = 'Rule name cannot exceed 128 characters.';
    if (!conditionValue.trim()) errors.conditionValue = 'Condition value is required.';

    // Validate condition value against known values when field is status or priority
    if (conditionField === AUTOMATION_CONDITION_FIELDS.STATUS) {
      const validStatuses = TASK_STATUS_LIST.map((s) => s.value);
      if (conditionOperator !== AUTOMATION_OPERATORS.CONTAINS && !validStatuses.includes(conditionValue.trim().toLowerCase())) {
        errors.conditionValue = `Must be one of: ${validStatuses.join(', ')}`;
      }
    }
    if (conditionField === AUTOMATION_CONDITION_FIELDS.PRIORITY) {
      const validPriorities = TASK_PRIORITY_LIST.map((p) => p.value);
      if (conditionOperator !== AUTOMATION_OPERATORS.CONTAINS && !validPriorities.includes(conditionValue.trim().toLowerCase())) {
        errors.conditionValue = `Must be one of: ${validPriorities.join(', ')}`;
      }
    }

    if (actionType === AUTOMATION_ACTIONS.CREATE_NOTIFICATION || actionType === AUTOMATION_ACTIONS.LOG_ACTIVITY) {
      if (!actionTitle.trim()) errors.actionTitle = 'Title is required.';
      if (!actionMessage.trim()) errors.actionMessage = 'Message is required.';
    }

    if (actionType === AUTOMATION_ACTIONS.SET_TASK_STATUS) {
      if (!Object.values(TASK_STATUSES).includes(targetStatus)) {
        errors.targetStatus = 'Please select a valid target status.';
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError(Object.values(validationErrors)[0]);
      return;
    }

    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const actionPayload = {};
      if (actionType === AUTOMATION_ACTIONS.CREATE_NOTIFICATION) {
        actionPayload.title = actionTitle.trim();
        actionPayload.message = actionMessage.trim();
      } else if (actionType === AUTOMATION_ACTIONS.LOG_ACTIVITY) {
        actionPayload.title = actionTitle.trim();
        actionPayload.details = actionMessage.trim();
      } else if (actionType === AUTOMATION_ACTIONS.SET_TASK_STATUS) {
        actionPayload.targetStatus = targetStatus;
      }

      await onSubmit({
        name: name.trim(),
        projectId,
        triggerEvent,
        conditionField,
        conditionOperator,
        conditionValue: conditionValue.trim().toLowerCase(),
        actionType,
        actionPayload,
        isEnabled: true,
      });
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to save automation rule.');
    } finally {
      setLoading(false);
    }
  };

  const projectOptions = [
    { value: '', label: 'All Projects (Global Rule)' },
    ...projects.map((p) => ({ value: p.$id, label: p.name })),
  ];

  const showNotificationFields = actionType === AUTOMATION_ACTIONS.CREATE_NOTIFICATION || actionType === AUTOMATION_ACTIONS.LOG_ACTIVITY;
  const showTargetStatus = actionType === AUTOMATION_ACTIONS.SET_TASK_STATUS;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Automation Rule' : 'Create Automation Rule'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4" id="rule-form">
        {error && <Alert variant="error" message={error} />}

        <Input
          label="Rule Title"
          id="rule-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Notify team on Urgent Priority"
          required
          error={fieldErrors.name}
        />

        <Select
          label="Project Scope"
          id="rule-project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          options={projectOptions}
        />

        {/* WHEN Block */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-2">
            1. WHEN (Trigger Event)
          </span>
          <Select
            id="rule-trigger"
            value={triggerEvent}
            onChange={(e) => setTriggerEvent(e.target.value)}
            options={TRIGGER_OPTIONS}
          />
        </div>

        {/* IF Block */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
            2. IF (Condition Criteria)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              id="rule-condition-field"
              value={conditionField}
              onChange={(e) => setConditionField(e.target.value)}
              options={CONDITION_FIELD_OPTIONS}
            />

            <Select
              id="rule-condition-op"
              value={conditionOperator}
              onChange={(e) => setConditionOperator(e.target.value)}
              options={OPERATOR_OPTIONS}
            />

            <Input
              id="rule-condition-val"
              value={conditionValue}
              onChange={(e) => setConditionValue(e.target.value)}
              placeholder={`e.g. ${getConditionValueHint(conditionField).split(',')[0].trim()}`}
              helperText={`Valid: ${getConditionValueHint(conditionField)}`}
              required
              error={fieldErrors.conditionValue}
            />
          </div>
        </div>

        {/* THEN Block */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
            3. THEN (Action Execution)
          </span>
          <Select
            id="rule-action"
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            options={ACTION_OPTIONS}
          />

          {showNotificationFields && (
            <>
              <Input
                label={actionType === AUTOMATION_ACTIONS.LOG_ACTIVITY ? 'Log Entry Title' : 'Notification Title'}
                id="action-title"
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
                placeholder="Notification Title"
                required
                error={fieldErrors.actionTitle}
              />

              <Input
                label={actionType === AUTOMATION_ACTIONS.LOG_ACTIVITY ? 'Log Details' : 'Notification Message'}
                id="action-message"
                value={actionMessage}
                onChange={(e) => setActionMessage(e.target.value)}
                placeholder="Details sent to notification stream"
                required
                error={fieldErrors.actionMessage}
              />
            </>
          )}

          {showTargetStatus && (
            <div>
              <Select
                label="Target Status"
                id="action-target-status"
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                options={TARGET_STATUS_OPTIONS}
                error={fieldErrors.targetStatus}
              />
              <p className="text-[11px] text-amber-400/80 mt-2 flex items-start gap-1.5">
                <span className="shrink-0 mt-0.5">⚠</span>
                <span>
                  This action will update the task status automatically. The engine prevents infinite loops — if this action
                  triggers another status change, nested re-entrant processing is blocked.
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={loading} id="btn-save-rule">
            {initialData ? 'Save Changes' : 'Create Automation Rule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
