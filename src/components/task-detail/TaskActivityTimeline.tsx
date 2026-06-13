import React from 'react';
import { AlertCircle, Calendar, CheckCircle2, Clock, Edit3, MessageSquare, Tag, User } from 'lucide-react';
import { TaskActivity } from '../../services/taskActivityService';

const ACTIVITY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  created: CheckCircle2,
  assigned: User,
  reassigned: User,
  status_changed: AlertCircle,
  priority_changed: Tag,
  deadline_changed: Calendar,
  comment_added: MessageSquare,
  description_updated: Edit3,
  category_changed: Tag,
  completed: CheckCircle2,
};

interface TaskActivityTimelineProps {
  activities: TaskActivity[];
  loading: boolean;
  formatDate: (dateStr: string | null) => string;
}

export const TaskActivityTimeline: React.FC<TaskActivityTimelineProps> = ({ activities, loading, formatDate }) => {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (activities.length === 0) {
    return <div className="text-center py-8 text-slate-500 text-sm">No activity yet</div>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = ACTIVITY_ICONS[activity.activity_type] || Clock;
        return (
          <div key={activity.id} className="flex gap-3">
            <div className="mt-1">
              <div className="w-8 h-8 rounded-full bg-matte-black border border-slate-700 flex items-center justify-center">
                <Icon className="w-4 h-4 text-slate-400" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-white">{activity.details}</p>
              <p className="text-[10px] text-slate-500 mt-1">
                {activity.user_name} ({activity.user_role}) | {formatDate(activity.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
