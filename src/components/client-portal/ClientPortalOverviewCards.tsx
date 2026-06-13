import React from 'react';
import { Clock, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

interface ClientPortalOverviewCardsProps {
  pendingFilings: number;
  filedThisMonth: number;
  activeNotices: number;
  totalDocuments: number;
}

export const ClientPortalOverviewCards: React.FC<ClientPortalOverviewCardsProps> = ({ pendingFilings, filedThisMonth, activeNotices, totalDocuments }) => {
  const cards = [
    { label: 'Pending Filings', value: pendingFilings, icon: Clock, tone: 'text-amber-400' },
    { label: 'Filed This Month', value: filedThisMonth, icon: CheckCircle2, tone: 'text-emerald-400' },
    { label: 'Active Notices', value: activeNotices, icon: AlertCircle, tone: 'text-red-400' },
    { label: 'Total Documents', value: totalDocuments, icon: FileText, tone: 'text-gold' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {cards.map((card) => (
        <div key={card.label} className="p-6 rounded-3xl border border-slate-800 bg-matte-black-light">
          <div className="flex items-center justify-between mb-4">
            <card.icon className={`w-5 h-5 ${card.tone}`} />
            <span className="text-xs uppercase tracking-[0.24em] text-slate-500">{card.label}</span>
          </div>
          <p className="text-3xl font-bold text-white">{card.value}</p>
        </div>
      ))}
    </div>
  );
};
