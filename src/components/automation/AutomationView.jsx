import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  Plus,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Activity,
  Bell,
  FileText,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../context/ProjectContext';
import { useNotifications } from '../../context/NotificationContext';
import { automationService } from '../../services/automationService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { Spinner } from '../common/Spinner';
import { RuleModal } from './RuleModal';
import { Alert } from '../common/Alert';
import {
  AUTOMATION_TRIGGER_LABELS,
  AUTOMATION_ACTION_LABELS,
  AUTOMATION_ACTIONS,
} from '../../config/constants';

export function AutomationView() {
  const { user } = useAuth();
  const { projects, activities, lastAutomationResults, fetchActivities } = useProjects();
  const { notifications } = useNotifications();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [activeSection, setActiveSection] = useState('rules'); // rules | history | notifications

  const fetchRules = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const items = await automationService.listRules(user.$id);
      setRules(items);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to load automation rules.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Auto-clear success messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleCreateNew = () => {
    setEditingRule(null);
    setModalOpen(true);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setModalOpen(true);
  };

  const handleToggle = async (rule) => {
    try {
      const updated = await automationService.updateRule(rule.$id, {
        isEnabled: !rule.isEnabled,
      });
      setRules((prev) => prev.map((r) => (r.$id === rule.$id ? updated : r)));
      setSuccessMessage(`Rule "${rule.name}" ${updated.isEnabled ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      setError(err?.message || 'Failed to toggle rule state.');
    }
  };

  const handleDelete = async (ruleId) => {
    const rule = rules.find((r) => r.$id === ruleId);
    if (window.confirm(`Delete automation rule "${rule?.name || ruleId}"?`)) {
      try {
        await automationService.deleteRule(ruleId);
        setRules((prev) => prev.filter((r) => r.$id !== ruleId));
        setSuccessMessage('Rule deleted successfully.');
      } catch (err) {
        setError(err?.message || 'Failed to delete rule.');
      }
    }
  };

  const handleModalSubmit = async (ruleData) => {
    if (editingRule) {
      await automationService.updateRule(editingRule.$id, ruleData);
      setSuccessMessage(`Rule "${ruleData.name}" updated.`);
    } else {
      await automationService.createRule(ruleData, user.$id);
      setSuccessMessage(`Rule "${ruleData.name}" created.`);
    }
    await fetchRules();
  };

  // Filter activities to only show automation-related entries
  const automationActivities = activities.filter(
    (a) => a.action === 'AUTOMATION_EXECUTED' || a.action === 'AUTOMATION_SET_STATUS' || a.action === 'RULE_EXECUTED'
  );

  // Recent notifications (from automation)
  const recentNotifications = notifications.slice(0, 10);

  const enabledCount = rules.filter((r) => r.isEnabled).length;
  const disabledCount = rules.length - enabledCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">Automation Engine</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono">
                WHEN / IF / THEN
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Event-driven rules engine. Create rules to automate notifications, audit logs, and task status updates when tasks change.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {enabledCount} active
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-slate-500" />
                {disabledCount} disabled
              </span>
            </div>
            <Button variant="primary" size="sm" onClick={handleCreateNew} id="btn-create-rule">
              <Plus className="w-4 h-4" /> Add Rule
            </Button>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && <Alert variant="error" message={error} />}
      {successMessage && <Alert variant="success" message={successMessage} />}

      {/* Last Automation Execution Results */}
      {lastAutomationResults.length > 0 && (
        <div className="glass-card rounded-xl p-4 border border-slate-800">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            Last Execution Results
          </h4>
          <div className="space-y-1.5">
            {lastAutomationResults.map((result, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {result.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                <span className="text-slate-300">
                  <span className="font-medium text-slate-100">{result.ruleName || result.ruleId}</span>
                  {' → '}
                  <span className="font-mono text-slate-400">{result.action}</span>
                </span>
                {result.error && (
                  <span className="text-rose-400 ml-1">({result.error})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/50 rounded-xl border border-slate-800 w-fit">
        {[
          { key: 'rules', label: 'Rules', icon: ShieldCheck, count: rules.length },
          { key: 'history', label: 'Execution Log', icon: Activity, count: automationActivities.length },
          { key: 'notifications', label: 'Notifications', icon: Bell, count: recentNotifications.length },
        ].map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            id={`tab-${key}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeSection === key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeSection === key ? 'bg-indigo-500/50' : 'bg-slate-800'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Rules Section */}
      {activeSection === 'rules' && (
        <>
          {loading ? (
            <div className="py-12 flex justify-center">
              <Spinner size="md" />
            </div>
          ) : rules.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="No Automation Rules Configured"
              description="Create your first rule to trigger notifications, audit logs, or status changes whenever tasks change."
              actionLabel="Create Rule"
              onAction={handleCreateNew}
            />
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => {
                const projectName = projects.find((p) => p.$id === rule.projectId)?.name;
                const triggerLabel = AUTOMATION_TRIGGER_LABELS[rule.triggerEvent] || rule.triggerEvent;
                const actionLabel = AUTOMATION_ACTION_LABELS[rule.actionType] || rule.actionType;

                // Parse payload for display
                let payloadInfo = '';
                try {
                  const payload = typeof rule.actionPayload === 'string'
                    ? JSON.parse(rule.actionPayload) : (rule.actionPayload || {});
                  if (rule.actionType === AUTOMATION_ACTIONS.SET_TASK_STATUS && payload.targetStatus) {
                    payloadInfo = ` → ${payload.targetStatus}`;
                  }
                } catch { /* ignore */ }

                return (
                  <div
                    key={rule.$id}
                    id={`rule-${rule.$id}`}
                    className={`glass-card rounded-xl p-5 border transition-all ${
                      rule.isEnabled
                        ? 'border-slate-800/80 hover:border-indigo-500/50'
                        : 'border-slate-800/40 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggle(rule)}
                          title={rule.isEnabled ? 'Disable rule' : 'Enable rule'}
                          className="mt-0.5 text-slate-400 hover:text-indigo-400 cursor-pointer"
                          id={`toggle-${rule.$id}`}
                        >
                          {rule.isEnabled ? (
                            <ToggleRight className="w-6 h-6 text-indigo-400" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-600" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm text-slate-100">{rule.name}</h4>
                            <Badge variant={rule.isEnabled ? 'primary' : 'default'}>
                              {rule.isEnabled ? 'Active' : 'Disabled'}
                            </Badge>
                            {projectName && (
                              <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                {projectName}
                              </span>
                            )}
                            {!rule.projectId && (
                              <span className="text-[10px] text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                                Global
                              </span>
                            )}
                          </div>

                          {/* Rule Syntax Preview */}
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300 mt-2 font-mono">
                            <span className="text-indigo-400 font-bold">WHEN</span>
                            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                              {triggerLabel}
                            </span>

                            <span className="text-cyan-400 font-bold ml-1">IF</span>
                            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                              {rule.conditionField} {rule.conditionOperator.toLowerCase()} &quot;{rule.conditionValue}&quot;
                            </span>

                            <span className="text-emerald-400 font-bold ml-1">THEN</span>
                            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                              {actionLabel}{payloadInfo}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:self-center">
                        <button
                          onClick={() => handleEdit(rule)}
                          title="Edit rule"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
                          id={`edit-${rule.$id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.$id)}
                          title="Delete rule"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                          id={`delete-${rule.$id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Execution History Section */}
      {activeSection === 'history' && (
        <div className="glass-card rounded-xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Automation Execution Log
            </h3>
            <Button variant="ghost" size="sm" onClick={fetchActivities}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>

          {automationActivities.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p>No automation executions recorded yet.</p>
              <p className="text-slate-500 mt-1">
                Rules will log entries here when tasks trigger matching conditions.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {automationActivities.map((act) => {
                const projectName = projects.find((p) => p.$id === act.projectId)?.name;
                return (
                  <div key={act.$id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={act.action === 'AUTOMATION_SET_STATUS' ? 'cyan' : 'primary'}>
                          {act.action}
                        </Badge>
                        {projectName && (
                          <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {projectName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">{act.details}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{act.actorName}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">ID: {act.$id?.slice(0, 10)}...</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {act.$createdAt
                          ? new Date(act.$createdAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Recently'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Notifications Section */}
      {activeSection === 'notifications' && (
        <div className="glass-card rounded-xl border border-slate-800 p-5">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-indigo-400" />
            Recent Notifications
          </h3>

          {recentNotifications.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p>No notifications yet.</p>
              <p className="text-slate-500 mt-1">
                Notifications generated by automation rules will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {recentNotifications.map((notif) => (
                <div key={notif.$id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        notif.isRead ? 'bg-slate-600' : 'bg-indigo-400 animate-pulse'
                      }`} />
                      <h5 className="text-xs font-semibold text-slate-100">{notif.title}</h5>
                      <Badge variant={notif.type === 'success' ? 'success' : notif.type === 'warning' ? 'warning' : notif.type === 'alert' ? 'danger' : 'primary'}>
                        {notif.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pl-4">{notif.message}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {notif.$createdAt
                        ? new Date(notif.$createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Recently'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Engine Info */}
      <div className="glass-card rounded-xl p-4 border border-slate-800/60">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Engine Capabilities</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400">
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/50">
            <span className="text-indigo-400 font-semibold block mb-1">Supported Triggers</span>
            <span className="font-mono text-[11px]">task.created • task.status_changed • task.completed</span>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/50">
            <span className="text-emerald-400 font-semibold block mb-1">Available Actions</span>
            <span className="font-mono text-[11px]">notification • audit log • set task status</span>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/50">
            <span className="text-amber-400 font-semibold block mb-1">Safety</span>
            <span className="font-mono text-[11px]">allowlist validation • loop prevention • dedup window</span>
          </div>
        </div>
      </div>

      <RuleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingRule}
      />
    </div>
  );
}
