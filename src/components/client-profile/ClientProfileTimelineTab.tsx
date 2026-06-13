/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { formatDate } from '../../lib/clientProfileFormatters';

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  date: string;
}

interface ClientProfileTimelineTabProps {
  timeline: TimelineEvent[];
}

/**
 * Displays activity timeline/history for a client
 */
export const ClientProfileTimelineTab: React.FC<ClientProfileTimelineTabProps> = ({
  timeline,
}) => {
  return (
    <div className="space-y-4">
      {timeline.map((event) => (
        <div key={event.id} className="border-l border-slate-700 pl-4">
          <p className="text-sm font-bold text-white">{event.title}</p>
          <p className="text-xs text-slate-500">{event.description}</p>
          <p className="mt-1 text-[10px] text-slate-600">{formatDate(event.date)}</p>
        </div>
      ))}
    </div>
  );
};
