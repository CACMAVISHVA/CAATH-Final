import React, { useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { createInvoice, GSTTreatment, Invoice, InvoiceCategory, PlaceOfSupply } from '../services/invoiceService';
import { User } from '../types';

export type InvoiceTemplate = 'Classic' | 'Modern' | 'Minimal';
type ClientOption = { id: string; name: string };
type DraftLine = { description: string; quantity: number; rate: number; discount: number; gstRate: number };

const freshLine = (): DraftLine => ({ description: '', quantity: 1, rate: 0, discount: 0, gstRate: 18 });
const isoDate = (offset = 0) => { const value = new Date(); value.setDate(value.getDate() + offset); return value.toISOString().slice(0, 10); };
const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);

export const InvoiceComposer: React.FC<{ clients: ClientOption[]; user: User; logoUrl: string | null; template: InvoiceTemplate; onTemplateChange: (value: InvoiceTemplate) => void; onCreated: (invoice: Invoice, clientName: string) => void }> = ({ clients, user, logoUrl, template, onTemplateChange, onCreated }) => {
  const [clientId, setClientId] = useState('');
  const [category, setCategory] = useState<InvoiceCategory>('Professional Services');
  const [place, setPlace] = useState<PlaceOfSupply>('Within State');
  const [treatment, setTreatment] = useState<GSTTreatment>('Registered');
  const [issueDate, setIssueDate] = useState(isoDate());
  const [dueDate, setDueDate] = useState(isoDate(15));
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('Payment due within the stated credit period.');
  const [lines, setLines] = useState<DraftLine[]>([freshLine()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const selectedClient = clients.find(client => client.id === clientId);
  const totals = useMemo(() => lines.reduce((sum, line) => {
    const base = Math.max(0, line.quantity * line.rate - line.discount);
    const gst = ['RCM', 'Export', 'SEZ'].includes(treatment) ? 0 : base * line.gstRate / 100;
    return { subtotal: sum.subtotal + line.quantity * line.rate, discount: sum.discount + line.discount, gst: sum.gst + gst, total: sum.total + base + gst };
  }, { subtotal: 0, discount: 0, gst: 0, total: 0 }), [lines, treatment]);
  const updateLine = (index: number, updates: Partial<DraftLine>) => setLines(current => current.map((line, position) => position === index ? { ...line, ...updates } : line));
  const save = async () => {
    setError('');
    if (!user.firmId || !selectedClient) return setError('Please select a client.');
    if (dueDate < issueDate) return setError('Due date cannot be before invoice date.');
    if (lines.some(line => line.description.trim().length < 2 || line.quantity <= 0 || line.rate < 0 || line.discount < 0 || line.discount > line.quantity * line.rate)) return setError('Please enter valid service details, quantities, rates and discounts.');
    setSaving(true);
    try {
      const invoice = await createInvoice({ firmId: user.firmId, clientId, clientName: selectedClient.name, placeOfSupply: place, gstTreatment: treatment, billingCategory: category, issueDate, dueDate, lineItems: lines.map(line => ({ ...line, description: line.description.trim() })), notes, terms, user });
      onCreated(invoice, selectedClient.name);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create invoice.'); } finally { setSaving(false); }
  };
  const field = 'w-full border border-slate-700 bg-matte-black px-3 py-2 text-sm text-white outline-none focus:border-gold';
  return <div className="space-y-5">
    <div className="flex items-center justify-between border-b border-slate-800 pb-4"><div>{logoUrl ? <img src={logoUrl} alt="Firm invoice logo" className="h-16 w-32 object-contain object-left"/> : <p className="text-xs text-amber-300">Upload a firm logo from Billing & Revenue.</p>}</div><div className="text-right"><p className="font-black text-white">{user.firm?.name || 'Your Firm'}</p><p className="text-xs uppercase tracking-wider text-gold">Tax Invoice</p></div></div>
    <div><p className="mb-2 text-xs font-bold uppercase text-slate-500">Template</p><div className="grid grid-cols-3 gap-2">{(['Classic','Modern','Minimal'] as InvoiceTemplate[]).map(value => <button key={value} onClick={() => onTemplateChange(value)} className={`border px-3 py-2 text-sm font-bold ${template === value ? 'border-gold bg-gold/10 text-gold' : 'border-slate-800 text-slate-400'}`}>{value}</button>)}</div></div>
    <div className="grid gap-3 md:grid-cols-2"><select value={clientId} onChange={event => setClientId(event.target.value)} className={field}><option value="">Select client *</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select><select value={category} onChange={event => setCategory(event.target.value as InvoiceCategory)} className={field}>{['Professional Services','Audit Services','Tax Services','ROC Services','Payroll Services','Consulting','Other'].map(value => <option key={value}>{value}</option>)}</select><select value={place} onChange={event => setPlace(event.target.value as PlaceOfSupply)} className={field}><option>Within State</option><option>Inter State</option><option>Export</option></select><select value={treatment} onChange={event => setTreatment(event.target.value as GSTTreatment)} className={field}>{['Registered','Unregistered','Composition','Export','SEZ','RCM'].map(value => <option key={value}>{value}</option>)}</select><label className="text-xs text-slate-500">Invoice date<input type="date" value={issueDate} onChange={event => setIssueDate(event.target.value)} className={`${field} mt-1`}/></label><label className="text-xs text-slate-500">Due date<input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} className={`${field} mt-1`}/></label></div>
    <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-bold text-white">Services</h3><button onClick={() => setLines(current => [...current, freshLine()])} className="flex items-center gap-1 text-sm font-bold text-gold"><Plus className="h-4 w-4"/>Add line</button></div>{lines.map((line,index) => <div key={index} className="grid gap-2 border border-slate-800 bg-matte-black p-3 md:grid-cols-[2fr_.65fr_1fr_.8fr_.65fr_auto]"><input value={line.description} maxLength={300} onChange={event => updateLine(index,{description:event.target.value})} placeholder="Service description" className={field}/><input type="number" min="0.01" step="0.01" value={line.quantity} onChange={event => updateLine(index,{quantity:Number(event.target.value)})} placeholder="Qty" className={field}/><input type="number" min="0" step="0.01" value={line.rate} onChange={event => updateLine(index,{rate:Number(event.target.value)})} placeholder="Rate" className={field}/><input type="number" min="0" step="0.01" value={line.discount} onChange={event => updateLine(index,{discount:Number(event.target.value)})} placeholder="Discount" className={field}/><select value={line.gstRate} onChange={event => updateLine(index,{gstRate:Number(event.target.value)})} className={field}>{[0,5,12,18,28].map(rate => <option key={rate} value={rate}>{rate}%</option>)}</select><button disabled={lines.length === 1} onClick={() => setLines(current => current.filter((_,position) => position !== index))} className="p-2 text-red-400 disabled:opacity-30"><Trash2 className="h-4 w-4"/></button></div>)}</div>
    <div className="grid gap-3 md:grid-cols-2"><textarea value={notes} maxLength={1000} onChange={event => setNotes(event.target.value)} placeholder="Notes" className={field}/><textarea value={terms} maxLength={1000} onChange={event => setTerms(event.target.value)} placeholder="Terms" className={field}/></div>
    <div className="ml-auto max-w-sm space-y-2 border border-slate-800 bg-matte-black p-4 text-sm"><p className="flex justify-between"><span>Subtotal</span><b>{money(totals.subtotal)}</b></p><p className="flex justify-between"><span>Discount</span><b>- {money(totals.discount)}</b></p><p className="flex justify-between"><span>GST</span><b>{money(totals.gst)}</b></p><p className="flex justify-between border-t border-slate-700 pt-2 text-lg text-gold"><span>Total</span><b>{money(totals.total)}</b></p></div>
    {error && <div className="border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
    <button disabled={saving} onClick={save} className="flex w-full items-center justify-center gap-2 bg-gold px-5 py-3 font-black text-black disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin"/>}Create Invoice</button>
  </div>;
};
