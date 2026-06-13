import React from 'react';
import { motion } from 'motion/react';
import { Logo } from '../Logo';

export const PageLoader: React.FC<{ title?: string }> = ({ title = 'Loading' }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
    <motion.div
      animate={{
        scale: [1, 1.1, 1],
        rotate: [0, 5, -5, 0]
      }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      className="mb-6"
    >
      <Logo size="xl" />
    </motion.div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-sm text-slate-500 mb-6">Preparing your workspace...</p>
    <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gold rounded-full"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  </div>
);