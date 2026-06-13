import React from 'react';
import { motion } from 'motion/react';

export const AnalyticsLoader: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="p-5 bg-matte-black-light rounded-2xl border border-slate-800"
        >
          <div className="h-3 w-16 bg-slate-800/50 rounded animate-pulse mb-4" />
          <div className="h-8 w-20 bg-slate-800/40 rounded animate-pulse" />
        </motion.div>
      ))}
    </div>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="p-8 bg-matte-black-light rounded-2xl border border-slate-800 min-h-[300px]"
    >
      <div className="h-full flex items-center justify-center">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              className="w-12 bg-gold/20 rounded-t"
              animate={{ height: [40, 80, 60, 90, 50, 70] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  </div>
);