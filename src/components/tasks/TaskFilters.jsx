import React from 'react';
import { Search, LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { TASK_STATUS_LIST, TASK_PRIORITY_LIST } from '../../config/constants';

export function TaskFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
}) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 glass-card p-3 rounded-xl border border-slate-800">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks by title, description or assignee..."
          className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 hover:border-slate-600 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
        />
      </div>

      {/* Filter Selects & View Toggle */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="">All Statuses</option>
          {TASK_STATUS_LIST.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => onPriorityFilterChange(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="">All Priorities</option>
          {TASK_PRIORITY_LIST.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="recent">Newest First</option>
          <option value="priority">Highest Priority</option>
          <option value="dueDate">Due Date</option>
        </select>

        {/* Kanban vs List Switcher */}
        <div className="flex p-0.5 bg-slate-900 border border-slate-700/80 rounded-lg ml-auto sm:ml-0">
          <button
            type="button"
            onClick={() => onViewModeChange('kanban')}
            title="Kanban Board View"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            title="List View"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
