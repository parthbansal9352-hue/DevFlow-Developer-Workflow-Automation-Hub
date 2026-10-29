import { describe, it, expect } from 'vitest';
import { computeDashboardStats } from '../src/services/statsService';
import { TASK_STATUSES, TASK_PRIORITIES, PROJECT_STATUSES } from '../src/config/constants';

describe('Stats Service Unit Tests', () => {
  it('returns safe zero defaults when arrays are empty', () => {
    const stats = computeDashboardStats([], []);
    expect(stats.totalProjects).toBe(0);
    expect(stats.activeProjects).toBe(0);
    expect(stats.archivedProjects).toBe(0);
    expect(stats.totalTasks).toBe(0);
    expect(stats.doneTasks).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(stats.overdueTasks).toBe(0);
    expect(stats.priorityCounts).toEqual({
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    });
  });

  it('computes accurate project and task statistics from authentic records', () => {
    const projects = [
      { $id: 'p1', name: 'Web Client', status: PROJECT_STATUSES.ACTIVE },
      { $id: 'p2', name: 'Legacy Service', status: PROJECT_STATUSES.ARCHIVED },
      { $id: 'p3', name: 'Mobile App', status: PROJECT_STATUSES.ACTIVE },
    ];

    const tasks = [
      { $id: 't1', status: TASK_STATUSES.TODO, priority: TASK_PRIORITIES.LOW },
      { $id: 't2', status: TASK_STATUSES.IN_PROGRESS, priority: TASK_PRIORITIES.MEDIUM },
      { $id: 't3', status: TASK_STATUSES.IN_REVIEW, priority: TASK_PRIORITIES.HIGH },
      { $id: 't4', status: TASK_STATUSES.DONE, priority: TASK_PRIORITIES.URGENT },
    ];

    const stats = computeDashboardStats(projects, tasks);

    expect(stats.totalProjects).toBe(3);
    expect(stats.activeProjects).toBe(2);
    expect(stats.archivedProjects).toBe(1);

    expect(stats.totalTasks).toBe(4);
    expect(stats.todoTasks).toBe(1);
    expect(stats.inProgressTasks).toBe(1);
    expect(stats.inReviewTasks).toBe(1);
    expect(stats.doneTasks).toBe(1);

    // 1 done out of 4 = 25%
    expect(stats.completionRate).toBe(25);

    expect(stats.priorityCounts.low).toBe(1);
    expect(stats.priorityCounts.medium).toBe(1);
    expect(stats.priorityCounts.high).toBe(1);
    expect(stats.priorityCounts.urgent).toBe(1);
  });

  it('computes overdue tasks properly based on dueDate and completion state', () => {
    const pastDate = new Date(Date.now() - 86400000 * 5).toISOString(); // 5 days ago
    const futureDate = new Date(Date.now() + 86400000 * 5).toISOString(); // 5 days from now

    const tasks = [
      // Overdue: past due and NOT done
      { $id: 't1', status: TASK_STATUSES.TODO, priority: TASK_PRIORITIES.HIGH, dueDate: pastDate },
      // Not overdue: completed even though date was in past
      { $id: 't2', status: TASK_STATUSES.DONE, priority: TASK_PRIORITIES.HIGH, dueDate: pastDate },
      // Not overdue: due in future
      { $id: 't3', status: TASK_STATUSES.IN_PROGRESS, priority: TASK_PRIORITIES.MEDIUM, dueDate: futureDate },
      // No due date
      { $id: 't4', status: TASK_STATUSES.TODO, priority: TASK_PRIORITIES.LOW, dueDate: '' },
    ];

    const stats = computeDashboardStats([], tasks);
    expect(stats.overdueTasks).toBe(1);
  });
});
