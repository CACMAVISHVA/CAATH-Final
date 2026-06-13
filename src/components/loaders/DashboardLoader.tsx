import React from 'react';
import { motion } from 'motion/react';
import { Logo } from '../Logo';

export const DashboardLoader: React.FC = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="text-center">
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        className="mb-4"
      >
        <Logo size="lg" />
      </motion.div>
      <div className="space-y-2">
        <div className="w-48 h-4 bg-slate-800/50 rounded animate-pulse mx-auto" />
        <div className="w-32 h-3 bg-slate-800/30 rounded animate-pulse mx-auto" />
      </div>
      <div className="mt-6 flex justify-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-gold/60"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  </div>
);