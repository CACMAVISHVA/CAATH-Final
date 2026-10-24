import React, { useState } from 'react';
import { Download, FileCheck2, FileText, ShieldCheck } from 'lucide-react';
import { generatePracticeDocument, PracticeTemplateId, PracticeTemplateInput } from '../services/documentTemplateService';

const templates: Array<{ id: PracticeTemplateId; title: string; description: string; law: string }> = [
  { id: 'directors-report', title: "Directors' Report", description: 'Structured Board report working draft with financial and statutory disclosure sections.', law: 'Companies Act, 2013 · Section 134' },
  { id: 'board-minutes', title: 'Board Meeting Minutes', description: 'Agenda, quorum, deliberation and resolution recording framework.', law: 'Companies Act, 2013 · SS-1' },
  { id: 'agm-notice', title: 'AGM Notice', description: 'Ordinary and special business framework with meeting notes.', law: 'Sections 101–102 · SS-2' },
  { id: 'management-representation', title: 'Management Representation', description: 'Audit-tailored representation letter working draft.', law: 'SA 580 working draft' },
];

const initialInput: PracticeTemplateInput = { companyName: '', cin: '', registeredOffice: '', financialYearEnd: '', documentDate: new Date().toISOString().slice(0, 10), place: '', meetingCount: '', signatoryName: '' };

export const TemplateStudio: React.FC = () => {
  const [selected, setSelected] = useState<PracticeTemplateId>('directors-report');
  const [input, setInput] = useState(initialInput);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (key: keyof PracticeTemplateInput, value: string) => setInput((current) => ({ ...current, [key]: value }));
  const download = async () => { setBusy(true); setMessage(''); try { await generatePracticeDocument(selected, input); setMessage('Word document generated. Review the entity-specific facts and applicability before signing.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to generate this document.'); } finally { setBusy(false); } };
  const fieldClass = 'w-full border border-slate-700 bg-matte-black px-3 py-3 text-sm text-white outline-none focus:border-gold';

  return <div className="space-y-6 p-4 sm:p-6">
    <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">CAATH original resources</p><h2 className="mt-2 text-3xl font-black text-white">Document Template Studio</h2><p className="mt-2 max-w-3xl text-slate-400">Enter core engagement details once and download an editable Word working draft. Templates are drafting aids and require professional review before issue or filing.</p></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{templates.map((template) => <button key={template.id} onClick={() => setSelected(template.id)} className={`premium-surface p-5 text-left transition ${selected === template.id ? 'ring-2 ring-gold' : 'hover:border-gold/30'}`}><FileText className="h-5 w-5 text-gold"/><h3 className="mt-3 font-black text-white">{template.title}</h3><p className="mt-2 text-sm text-slate-400">{template.description}</p><p className="mt-3 text-xs font-bold text-gold-light">{template.law}</p></button>)}</div>
    {message && <div className="border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold-light">{message}</div>}
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="premium-surface p-5"><h3 className="mb-4 text-lg font-black text-white">Engagement details</h3><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-500">Company name<input value={input.companyName} onChange={(event) => update('companyName', event.target.value)} maxLength={160} className={`${fieldClass} mt-2`} /></label><label className="text-xs font-bold uppercase tracking-wider text-slate-500">CIN<input value={input.cin} onChange={(event) => update('cin', event.target.value.toUpperCase())} maxLength={21} placeholder="U12345TN2020PTC123456" className={`${fieldClass} mt-2`} /></label><label className="text-xs font-bold uppercase tracking-wider text-slate-500 sm:col-span-2">Registered office<input value={input.registeredOffice} onChange={(event) => update('registeredOffice', event.target.value)} maxLength={300} className={`${fieldClass} mt-2`} /></label><label className="text-xs font-bold uppercase tracking-wider text-slate-500">Financial year ended<input type="date" value={input.financialYearEnd} onChange={(event) => update('financialYearEnd', event.target.value)} className={`${fieldClass} mt-2`} /></label><label className="text-xs font-bold uppercase tracking-wider text-slate-500">Document / meeting date<input type="date" value={input.documentDate} onChange={(event) => update('documentDate', event.target.value)} className={`${fieldClass} mt-2`} /></label><label className="text-xs font-bold uppercase tracking-wider text-slate-500">Place<input value={input.place} onChange={(event) => update('place', event.target.value)} maxLength={120} className={`${fieldClass} mt-2`} /></label><label className="text-xs font-bold uppercase tracking-wider text-slate-500">Board meetings held<input type="number" min="0" max="100" value={input.meetingCount} onChange={(event) => update('meetingCount', event.target.value)} className={`${fieldClass} mt-2`} /></label><label className="text-xs font-bold uppercase tracking-wider text-slate-500 sm:col-span-2">Primary signatory<input value={input.signatoryName} onChange={(event) => update('signatoryName', event.target.value)} maxLength={120} className={`${fieldClass} mt-2`} /></label></div></div>
      <div className="premium-surface p-5"><FileCheck2 className="h-7 w-7 text-gold"/><h3 className="mt-4 text-xl font-black text-white">Ready-to-edit Word output</h3><ul className="mt-4 space-y-3 text-sm text-slate-400"><li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400"/>Generated locally in your browser.</li><li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400"/>No template data is stored by this tool.</li><li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400"/>Editable `.docx` output for final professional review.</li></ul><button disabled={busy} onClick={download} className="mt-6 flex w-full items-center justify-center gap-2 bg-gold px-4 py-3 font-black text-black disabled:opacity-50"><Download className="h-4 w-4"/>Download full Word draft</button><p className="mt-4 text-xs leading-relaxed text-slate-500">CAATH does not reproduce third-party template content. These are original structured working drafts based on publicly stated compliance requirements.</p></div>
    </div>
  </div>;
};

export default TemplateStudio;
