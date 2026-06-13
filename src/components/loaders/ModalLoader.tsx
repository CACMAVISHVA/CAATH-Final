import React from 'react';
import { motion } from 'motion/react';

export const ModalLoader: React.FC<{ label?: string }> = ({ label = 'Loading details' }) => (
  <div className="flex min-h-[240px] items-center justify-center">
    <div className="text-center">
      <motion.div
        className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-gold border-t-transparent"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
      />
      <p className="text-sm font-bold text-white">{label}</p>
      <p className="mt-1 text-xs text-slate-500">Preparing secure workspace data...</p>
    </div>
  </div>
);
