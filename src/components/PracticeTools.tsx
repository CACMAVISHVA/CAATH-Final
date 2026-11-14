import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Clock3, FileKey2, Plus, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { addDigitalSignatureCertificate, addTimeEntry, DigitalSignatureCertificate, listPracticeTools, TimeEntry } from '../services/practiceToolsService';

const today = () => new Date().toISOString().slice(0, 10);
const daysUntil = (date: string) => Math.ceil((new Date(`${date}T23:59:59`).getTime() - Date.now()) / 86400000);

export const PracticeTools: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'time' | 'dsc'>('time');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [certificates, setCertificates] = useState<DigitalSignatureCertificate[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [timeForm, setTimeForm] = useState({ date: today(), hours: '1', description: '', clientId: '', billable: true });
  const [dscForm, setDscForm] = useState({ holderName: '', pan: '', provider: '', serial: '', validFrom: today(), validUntil: '', alertDays: '30', clientId: '' });

  const load = useCallback(async () => {
    if (!user?.firmId) return;
    try {
      const data = await listPracticeTools(user.firmId);
      setEntries(data.timeEntries); setCertificates(data.certificates); setClients(data.clients);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load practice tools.'); }
  }, [user?.firmId]);

  useEffect(() => { void load(); }, [load]);
  const monthMinutes = useMemo(() => entries.filter((entry) => entry.work_date.slice(0, 7) === today().slice(0, 7)).reduce((sum, entry) => sum + entry.minutes, 0), [entries]);
  const expiring = useMemo(() => certificates.filter((certificate) => daysUntil(certificate.valid_until) <= certificate.alert_days), [certificates]);

  if (!user?.firmId) return <div className="p-8 text-slate-400">A firm workspace is required.</div>;

  const saveTime = async () => {
    setBusy(true); setMessage('');
    try { await addTimeEntry({ ...timeForm, hours: Number(timeForm.hours) }, user); setTimeForm({ date: today(), hours: '1', description: '', clientId: '', billable: true }); await load(); setMessage('Time entry saved.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save time entry.'); } finally { setBusy(false); }
  };

  const saveDsc = async () => {
    setBusy(true); setMessage('');
    try { await addDigitalSignatureCertificate({ ...dscForm, alertDays: Number(dscForm.alertDays) }, user); setDscForm({ holderName: '', pan: '', provider: '', serial: '', validFrom: today(), validUntil: '', alertDays: '30', clientId: '' }); await load(); setMessage('Digital signature certificate saved.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save certificate.'); } finally { setBusy(false); }
  };

  const inputClass = 'w-full border border-slate-700 bg-matte-black px-3 py-2.5 text-sm text-white outline-none focus:border-gold';
  return <div className="space-y-6 p-6">
    <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Practice productivity</p><h2 className="mt-2 text-3xl font-black text-white">Time & Digital Signature Control</h2><p className="mt-2 text-slate-400">Track team effort and prevent DSC expiry surprises from one governed workspace.</p></div>
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="premium-surface p-5"><Clock3 className="h-5 w-5 text-gold"/><p className="mt-3 text-2xl font-black text-white">{(monthMinutes / 60).toFixed(1)}h</p><p className="text-xs text-slate-500">Logged this month</p></div>
      <div className="premium-surface p-5"><FileKey2 className="h-5 w-5 text-gold"/><p className="mt-3 text-2xl font-black text-white">{certificates.length}</p><p className="text-xs text-slate-500">DSCs monitored</p></div>
      <div className="premium-surface p-5"><ShieldAlert className="h-5 w-5 text-amber-300"/><p className="mt-3 text-2xl font-black text-white">{expiring.length}</p><p className="text-xs text-slate-500">Expired or expiring</p></div>
    </div>
    <div className="flex gap-2 border-b border-white/10"><button onClick={() => setTab('time')} className={`px-4 py-3 font-bold ${tab === 'time' ? 'border-b-2 border-gold text-gold' : 'text-slate-500'}`}>Time Sheet</button><button onClick={() => setTab('dsc')} className={`px-4 py-3 font-bold ${tab === 'dsc' ? 'border-b-2 border-gold text-gold' : 'text-slate-500'}`}>DSC Register</button></div>
    {message && <div className="border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold-light">{message}</div>}
    {tab === 'time' ? <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <div className="premium-surface space-y-3 p-5"><h3 className="font-black text-white">Add time entry</h3><input type="date" value={timeForm.date} onChange={e => setTimeForm({...timeForm,date:e.target.value})} className={inputClass}/><input type="number" min="0.1" max="24" step="0.1" value={timeForm.hours} onChange={e => setTimeForm({...timeForm,hours:e.target.value})} placeholder="Hours" className={inputClass}/><select value={timeForm.clientId} onChange={e => setTimeForm({...timeForm,clientId:e.target.value})} className={inputClass}><option value="">General firm work</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select><textarea maxLength={1000} value={timeForm.description} onChange={e => setTimeForm({...timeForm,description:e.target.value})} placeholder="Work completed" className={inputClass}/><label className="flex gap-2 text-sm text-slate-300"><input type="checkbox" checked={timeForm.billable} onChange={e => setTimeForm({...timeForm,billable:e.target.checked})}/>Billable time</label><button disabled={busy} onClick={saveTime} className="flex w-full items-center justify-center gap-2 bg-gold px-4 py-3 font-black text-black disabled:opacity-50"><Plus className="h-4 w-4"/>Save entry</button></div>
      <div className="premium-surface overflow-x-auto p-5"><h3 className="mb-4 font-black text-white">Recent time entries</h3><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3">Date</th><th>Team member</th><th>Client</th><th>Work</th><th>Time</th></tr></thead><tbody>{entries.map(entry => <tr key={entry.id} className="border-t border-white/5"><td className="py-3">{entry.work_date}</td><td>{entry.user?.name || '—'}</td><td>{entry.client?.name || 'Firm'}</td><td className="max-w-xs truncate">{entry.description}</td><td className="font-bold text-gold">{(entry.minutes/60).toFixed(1)}h</td></tr>)}</tbody></table>{!entries.length && <p className="py-8 text-center text-slate-500">No time entries yet.</p>}</div>
    </div> : <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <div className="premium-surface space-y-3 p-5"><h3 className="font-black text-white">Register a DSC</h3><input value={dscForm.holderName} onChange={e => setDscForm({...dscForm,holderName:e.target.value})} placeholder="Certificate holder name" maxLength={120} className={inputClass}/><input value={dscForm.pan} onChange={e => setDscForm({...dscForm,pan:e.target.value.toUpperCase()})} placeholder="PAN (optional)" maxLength={10} className={inputClass}/><input value={dscForm.provider} onChange={e => setDscForm({...dscForm,provider:e.target.value})} placeholder="Provider / Certifying Authority" maxLength={120} className={inputClass}/><input value={dscForm.serial} onChange={e => setDscForm({...dscForm,serial:e.target.value})} placeholder="Certificate serial number" maxLength={200} className={inputClass}/><select value={dscForm.clientId} onChange={e => setDscForm({...dscForm,clientId:e.target.value})} className={inputClass}><option value="">Firm certificate</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select><div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-500">Valid from<input type="date" value={dscForm.validFrom} onChange={e => setDscForm({...dscForm,validFrom:e.target.value})} className={`${inputClass} mt-1`}/></label><label className="text-xs text-slate-500">Valid until<input type="date" value={dscForm.validUntil} onChange={e => setDscForm({...dscForm,validUntil:e.target.value})} className={`${inputClass} mt-1`}/></label></div><input type="number" min="1" max="365" value={dscForm.alertDays} onChange={e => setDscForm({...dscForm,alertDays:e.target.value})} placeholder="Alert days" className={inputClass}/><button disabled={busy || user.role === 'Staff'} onClick={saveDsc} className="flex w-full items-center justify-center gap-2 bg-gold px-4 py-3 font-black text-black disabled:opacity-50"><Plus className="h-4 w-4"/>Save certificate</button></div>
      <div className="premium-surface overflow-x-auto p-5"><h3 className="mb-4 font-black text-white">Digital signature register</h3><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3">Holder</th><th>Client</th><th>Provider</th><th>Expiry</th><th>Status</th></tr></thead><tbody>{certificates.map(certificate => { const days = daysUntil(certificate.valid_until); return <tr key={certificate.id} className="border-t border-white/5"><td className="py-3"><p className="font-bold text-white">{certificate.holder_name}</p><p className="text-xs text-slate-500">{certificate.holder_pan || certificate.certificate_serial}</p></td><td>{certificate.client?.name || 'Firm'}</td><td>{certificate.certificate_provider}</td><td>{certificate.valid_until}</td><td><span className={days < 0 ? 'text-red-400' : days <= certificate.alert_days ? 'text-amber-300' : 'text-emerald-400'}>{days < 0 ? 'Expired' : `${days} days`}</span></td></tr>; })}</tbody></table>{!certificates.length && <p className="py-8 text-center text-slate-500">No certificates registered yet.</p>}</div>
    </div>}
  </div>;
};

export default PracticeTools;
