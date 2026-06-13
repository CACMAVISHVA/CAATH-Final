import React from 'react';
import { motion } from 'motion/react';

export const TableLoader: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-matte-black-light rounded-2xl border border-slate-800 overflow-hidden">
    <div className="grid grid-cols-4 gap-4 p-4 border-b border-slate-800">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-3 bg-slate-800/50 rounded animate-pulse" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <motion.div
        key={rowIndex}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: rowIndex * 0.05 }}
        className="grid grid-cols-4 gap-4 p-4 border-b border-slate-800/50"
      >
        {[1, 2, 3, 4].map((colIndex) => (
          <div
            key={colIndex}
            className="h-4 bg-slate-800/30 rounded animate-pulse"
            style={{ width: `${60 + Math.random() * 40}%` }}
          />
        ))}
      </motion.div>
    ))}
  </div>
);