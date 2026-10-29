import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { TASK_STATUSES, TASK_STATUS_LIST, TASK_PRIORITIES, TASK_PRIORITY_LIST } from '../../config/constants';
import { useProjects } from '../../context/ProjectContext';

export function TaskModal({ isOpen, onClose, onSubmit, initialData = null }) {
  const { projects, activeProjectId } = useProjects();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(TASK_STATUSES.TODO);
  const [priority, setPriority] = useState(TASK_PRIORITIES.MEDIUM);
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setStatus(initialData.status || TASK_STATUSES.TODO);
      setPriority(initialData.priority || TASK_PRIORITIES.MEDIUM);
      setAssignee(initialData.assignee || '');
      setDueDate(initialData.dueDate ? initialData.dueDate.slice(0, 10) : '');
      setProjectId(initialData.projectId || activeProjectId || (projects[0]?.$id || ''));
    } else {
      setTitle('');
      setDescription('');
      setStatus(TASK_STATUSES.TODO);
      setPriority(TASK_PRIORITIES.MEDIUM);
      setAssignee('');
      setDueDate('');
      setProjectId(activeProjectId || (projects[0]?.$id || ''));
    }
    setError(null);
  }, [initialData, isOpen, activeProjectId, projects]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (!projectId) {
      setError('A target project must be selected.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assignee: assignee.trim(),
        dueDate,
        projectId,
      });
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to save task.');
    } finally {
      setLoading(false);
    }
  };

  const projectOptions = projects.map((p) => ({ value: p.$id, label: p.name }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Task' : 'Create New Task'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error" message={error} />}

        <Input
          label="Task Title"
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Implement OAuth token refresh flow"
          required
        />

        <div>
          <label htmlFor="task-desc" className="block text-xs font-medium text-slate-300 mb-1.5">
            Description
          </label>
          <textarea
            id="task-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Technical details, acceptance criteria..."
            className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-indigo-500 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Project"
            id="task-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            options={projectOptions}
            required
          />

          <Select
            label="Priority"
            id="task-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            options={TASK_PRIORITY_LIST.map((p) => ({ value: p.value, label: p.label }))}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Status"
            id="task-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={TASK_STATUS_LIST.map((s) => ({ value: s.value, label: s.label }))}
            required
          />

          <Input
            label="Assignee"
            id="task-assignee"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="e.g. alex@dev.io"
          />

          <Input
            label="Due Date"
            id="task-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={loading}>
            {initialData ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
