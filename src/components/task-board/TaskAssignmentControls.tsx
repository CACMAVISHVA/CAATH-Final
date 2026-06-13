import React from 'react';
import { Clock, Filter, Search } from 'lucide-react';

interface TaskAssignmentControlsProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCount: number;
  onOpenBulkReassign: () => void;
}

export const TaskAssignmentControls: React.FC<TaskAssignmentControlsProps> = ({
  searchTerm,
  onSearchChange,
  selectedCount,
  onOpenBulkReassign,
}) => (
  <div className="flex flex-col md:flex-row gap-4">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="text"
        placeholder="Search tasks, clients, or categories..."
        className="w-full pl-10 pr-4 py-2.5 bg-matte-black-light border border-slate-800 rounded-xl text-sm text-white focus:ring-2 focus:ring-gold focus:border-transparent transition-all"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {selectedCount > 0 && (
        <button
          onClick={onOpenBulkReassign}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500 rounded-xl text-sm font-bold text-amber-400 hover:bg-amber-500/20 transition-colors"
        >
          <Clock className="w-4 h-4" />
          Bulk Reassign ({selectedCount})
        </button>
      )}
      <button className="flex items-center gap-2 px-4 py-2 bg-matte-black-light border border-slate-800 rounded-xl text-sm font-bold text-slate-400 hover:text-gold transition-colors">
        <Filter className="w-4 h-4" />
        Filter
      </button>
    </div>
  </div>
);
