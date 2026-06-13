/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SystemNoticePublisherProps {
  noticeText: string;
  onNoticeTextChange: (text: string) => void;
  onPublish: () => void;
  isLoading: boolean;
}

export const SystemNoticePublisher: React.FC<SystemNoticePublisherProps> = ({
  noticeText,
  onNoticeTextChange,
  onPublish,
  isLoading,
}) => (
  <div className="p-6 bg-matte-black-light rounded-2xl border border-slate-800 max-w-3xl">
    <h3 className="text-lg font-bold text-white mb-4">Publish Platform Notice</h3>
    <textarea
      value={noticeText}
      onChange={(event) => onNoticeTextChange(event.target.value)}
      placeholder="Write a system-wide operational notice for firm owners..."
      className="w-full h-32 bg-matte-black border border-slate-800 rounded-xl p-4 text-sm text-white focus:ring-1 focus:ring-gold outline-none resize-none"
    />
    <button
      onClick={onPublish}
      disabled={!noticeText.trim() || isLoading}
      className="mt-4 px-5 py-3 bg-gold text-matte-black rounded-xl text-sm font-bold disabled:opacity-40"
    >
      Publish Notice
    </button>
  </div>
);
