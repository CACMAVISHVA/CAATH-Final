/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ className, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
      {/* Fallback/Background for the logo */}
      <div className="absolute inset-0 gold-gradient rounded-xl opacity-20 blur-sm" />
      <img 
        src="/logo.png" 
        alt="CAATH Logo" 
        className="relative z-10 w-full h-full object-contain"
        referrerPolicy="no-referrer"
        onError={(e) => {
          // Fallback if image is not found
          e.currentTarget.style.display = 'none';
          e.currentTarget.parentElement!.innerHTML = `
            <div class="w-full h-full gold-gradient rounded-xl flex items-center justify-center text-matte-black font-bold text-xl shadow-[0_0_20px_rgba(212,175,55,0.3)]">
              CA
            </div>
          `;
        }}
      />
    </div>
  );
};
