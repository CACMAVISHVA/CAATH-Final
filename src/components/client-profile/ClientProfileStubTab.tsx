/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ClientProfileStubTabProps {
  title: string;
  description: string;
}

/**
 * Reusable stub component for placeholder tabs (GST, MCA, Notices, Staff)
 */
export const ClientProfileStubTab: React.FC<ClientProfileStubTabProps> = ({
  title,
  description,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
};
