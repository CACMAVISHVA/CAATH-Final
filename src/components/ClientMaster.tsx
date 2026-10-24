/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Plus,
  Pencil,
  Trash2,
  Mail,
  Phone,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Shield,
  X,
  FileUp
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { canDeleteClient } from '../lib/permissions';
import {
  createClient,
  updateClient,
  deleteClient,
  getClients,
  validatePAN,
  validateGSTIN,
  ClientRow
} from '../services/clientService';
import { ModalLoader } from './loaders/ModalLoader';
import { ClientGovernanceSidebar } from './client-domain/ClientGovernanceSidebar';
import { Modal } from './Modal';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { clearSessionDraft, hasSessionDraft, readSessionDraft, writeSessionDraft } from '../hooks/useSessionDraft';
import { CLIENT_SERVICE_OPTIONS, ClientImportPreview, downloadClientImportCsvTemplate, downloadClientImportTemplate, importClientRows, parseClientImportFile } from '../services/clientBulkImportService';

const LeadPipeline = lazy(() => import('./LeadPipeline'));
const ClientProfile = lazy(() => import('./ClientProfile'));

interface ClientFormData {
  name: string;
  type: string;
  pan: string;
  gstin: string;
  tan: string;
  cinLlpin: string;
  portalUsername: string;
  email: string;
  phone: string;
  services: string[];
}

const defaultClientForm: ClientFormData = {
  name: '',
  type: '',
  pan: '',
  gstin: '',
  tan: '',
  cinLlpin: '',
  portalUsername: '',
  email: '',
  phone: '',
  services: [],
};

export const ClientMaster: React.FC<{ assignedOnly?: boolean; assignedClients?: string[] }> = ({ assignedOnly, assignedClients }) => {
  const { user } = useAuth();
  const clientDraftKey = `caath:draft:client:${user?.firmId || 'loading'}`;
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddClient, setShowAddClient] = useState(() => hasSessionDraft(clientDraftKey));
  const [clientToDelete, setClientToDelete] = useState<ClientRow | null>(null);
  const [editClient, setEditClient] = useState<ClientRow | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<ClientImportPreview | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ClientFormData>(() => readSessionDraft(clientDraftKey, defaultClientForm));
  const hasUnsavedClientChanges = (() => {
    if (showAddClient) {
      return JSON.stringify(formData) !== JSON.stringify(defaultClientForm);
    }
    if (editClient) {
      return (
        formData.name !== (editClient.name || '') ||
        formData.tan !== (editClient.tan || '') ||
        formData.cinLlpin !== (editClient.cin_llpin || '') ||
        formData.portalUsername !== (editClient.portal_username || '') ||
        formData.email !== (editClient.email || '') ||
        formData.phone !== (editClient.phone || '') ||
        JSON.stringify(formData.services) !== JSON.stringify(editClient.services || [])
      );
    }
    return false;
  })();
  const guardClientModalClose = useUnsavedChangesGuard(hasUnsavedClientChanges);

  const openAddClient = () => {
    setFormData(readSessionDraft(clientDraftKey, defaultClientForm));
    setShowAddClient(true);
    setFormError(null);
  };

  const closeAddClient = () => guardClientModalClose(() => {
    clearSessionDraft(clientDraftKey);
    setFormData(defaultClientForm);
    setShowAddClient(false);
    setFormError(null);
  });

  useEffect(() => {
    if (showAddClient) writeSessionDraft(clientDraftKey, formData);
  }, [clientDraftKey, formData, showAddClient]);

  const canManageClients = user?.role === 'SuperAdmin' || user?.role === 'Admin';
  const allowClientDelete = canDeleteClient(user);

  const loadClients = useCallback(async () => {
    if (!user?.firmId) return;

    setLoading(true);
    try {
      const data = await getClients(user.firmId);
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.firmId]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    const onQuickAction = (event: Event) => {
      const customEvent = event as CustomEvent<{ action?: string }>;
      if (customEvent.detail?.action === 'create-client' && canManageClients) {
        openAddClient();
      }
    };
    window.addEventListener('caath:quick-action', onQuickAction);
    return () => window.removeEventListener('caath:quick-action', onQuickAction);
  }, [canManageClients, clientDraftKey]);

  const toggleService = (service: string) => {
    setFormData((prev) => {
      const currentServices = prev.services ?? [];
      return {
        ...prev,
        services: currentServices.includes(service)
          ? currentServices.filter((s) => s !== service)
          : [...currentServices, service],
      };
    });
  };

  const handleSaveClient = async () => {
    if (!user || !canManageClients) return;

    setFormError(null);

    // Validate PAN
    const panValidation = validatePAN(formData.pan);
    if (!panValidation.valid) {
      setFormError(panValidation.error || 'Invalid PAN');
      return;
    }

    // Validate GSTIN if provided
    if (formData.gstin) {
      const gstinValidation = validateGSTIN(formData.gstin);
      if (!gstinValidation.valid) {
        setFormError(gstinValidation.error || 'Invalid GSTIN');
        return;
      }
    }

    if (!formData.name.trim()) {
      setFormError('Client name is required');
      return;
    }

    try {
      await createClient({
        firmId: user.firmId!,
        name: formData.name,
        type: formData.type,
        pan: formData.pan,
        gstin: formData.gstin,
        tan: formData.tan,
        cinLlpin: formData.cinLlpin,
        portalUsername: formData.portalUsername,
        email: formData.email,
        phone: formData.phone,
        services: formData.services,
        user,
      });

      setFormData(defaultClientForm);
      clearSessionDraft(clientDraftKey);
      setShowAddClient(false);
      loadClients();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save client');
    }
  };

  const handleUpdateClient = async () => {
    if (!user || !editClient || !canManageClients) return;

    setFormError(null);

    try {
      await updateClient(editClient.id, {
        name: formData.name,
        tan: formData.tan,
        cinLlpin: formData.cinLlpin,
        portalUsername: formData.portalUsername,
        email: formData.email,
        phone: formData.phone,
        services: formData.services,
      }, user);

      setEditClient(null);
      setFormData(defaultClientForm);
      loadClients();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to update client');
    }
  };

  const handleDeleteClient = async () => {
    if (!user || !clientToDelete) return;

    try {
      await deleteClient(clientToDelete.id, user);
      setClientToDelete(null);
      loadClients();
    } catch (error) {
      console.error('Failed to delete client:', error);
    }
  };

  const handleBulkFile = async (file?: File | null) => {
    if (!file) return;
    setUploading(true); setBulkError(null); setBulkPreview(null);
    try { setBulkPreview(await parseClientImportFile(file, clients.map((client) => client.pan))); }
    catch (error) { setBulkError(error instanceof Error ? error.message : 'Unable to read this import file.'); }
    finally { setUploading(false); }
  };

  const handleBulkImport = async () => {
    if (!user || !bulkPreview?.validRows.length) return;
    setUploading(true); setBulkError(null);
    try {
      const result = await importClientRows(user, bulkPreview.validRows);
      await loadClients();
      if (result.failed.length) {
        setBulkError(`${result.imported.length} clients imported. ${result.failed.length} row(s) could not be imported: ${result.failed.map((failure) => `row ${failure.rowNumber}: ${failure.error}`).join(' ')}`);
      } else {
        setShowBulkImport(false); setBulkPreview(null);
      }
    } catch (error) { setBulkError(error instanceof Error ? error.message : 'Unable to import clients.'); }
    finally { setUploading(false); }
  };

  const openEditModal = (client: ClientRow) => {
    setEditClient(client);
    setFormData({
      name: client.name || '',
      type: client.type || '',
      pan: client.pan || '',
      gstin: client.gstin || '',
      tan: client.tan || '',
      cinLlpin: client.cin_llpin || '',
      portalUsername: client.portal_username || '',
      email: client.email || '',
      phone: client.phone || '',
      services: client.services || [],
    });
    setFormError(null);
  };

  const filteredClients = clients.filter((client) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = [
      client.name,
      client.pan,
      client.gstin,
      client.tan,
      client.cin_llpin,
      client.email,
      client.phone,
    ].some((value) => String(value || '').toLowerCase().includes(query));

    if (assignedOnly && assignedClients) {
      return matchesSearch && assignedClients.includes(client.id);
    }
    return matchesSearch;
  });

  return (
    <>
    <div className="caath-page h-full space-y-6 overflow-y-auto bg-matte-black p-4 text-slate-300 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold gold-text-gradient">Client Master</h2>
          <p className="text-slate-500">Manage your clients and their compliance profiles.</p>
        </div>
        {canManageClients && <div className="flex flex-wrap gap-2"><button onClick={() => { setShowBulkImport(true); setBulkPreview(null); setBulkError(null); }} className="flex items-center gap-2 px-4 py-2.5 border border-slate-700 rounded-xl font-bold text-slate-200 hover:border-gold hover:text-gold"><FileUp className="w-4 h-4" />Bulk import</button><button onClick={openAddClient} className="flex items-center gap-2 px-6 py-2.5 bg-gold text-matte-black rounded-xl font-bold hover:bg-gold-light"><Plus className="w-4 h-4" />Add New Client</button></div>}
      </div>

      {import.meta.env.VITE_NOTICE_INTELLIGENCE === 'true' && !assignedOnly && <Suspense fallback={<p>Loading leads...</p>}><LeadPipeline clients={clients} /></Suspense>}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, PAN, GSTIN, TAN, CIN, email or phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-matte-black-light border border-slate-800 rounded-xl text-sm text-white focus:ring-2 focus:ring-gold focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-matte-black-light border border-slate-800 rounded-xl text-sm font-bold text-slate-400 hover:text-gold transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
      <div className="bg-matte-black-light rounded-2xl border border-slate-800 shadow-2xl overflow-x-auto">
        <table className="min-w-[1120px] w-full table-fixed text-left border-collapse">
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[16%]" />
            <col className="w-[19%]" />
            <col className="w-[7%]" />
            <col className="w-[16%]" />
            <col className="w-[9%]" />
            <col className="w-[17%]" />
          </colgroup>
          <thead>
            <tr className="bg-matte-black border-b border-slate-800">
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client Name</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client identifiers</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Risk Level</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Services</th>
              <th className="sticky right-0 z-20 bg-matte-black px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredClients.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  {searchTerm ? 'No clients match your search.' : 'No clients yet. Click "Add New Client" to get started.'}
                </td>
              </tr>
            )}
            {filteredClients.map((client) => (
              <motion.tr
                onClick={() => setSelectedClient(client)}
                key={client.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-matte-black transition-colors group"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gold/10 text-gold flex items-center justify-center font-bold text-xs border border-gold/20">
                      {(client.name ?? ' ')[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-gold transition-colors">{client.name ?? 'Unknown Client'}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{client.operational_id || `Client #${client.id.slice(0, 8)}`}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="inline-block max-w-full break-words rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-center text-[10px] font-bold uppercase leading-4 tracking-wide text-slate-300">
                    {client.type}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-1 break-all font-mono text-xs">
                    <p className="text-slate-300"><span className="mr-2 text-[10px] font-sans font-bold uppercase tracking-wide text-slate-500">PAN</span>{client.pan || '—'}</p>
                    {client.gstin && <p className="text-slate-400"><span className="mr-2 text-[10px] font-sans font-bold uppercase tracking-wide text-slate-500">GSTIN</span>{client.gstin}</p>}
                    {client.tan && <p className="text-slate-400"><span className="mr-2 text-[10px] font-sans font-bold uppercase tracking-wide text-slate-500">TAN</span>{client.tan}</p>}
                    {client.cin_llpin && <p className="text-slate-400"><span className="mr-2 text-[10px] font-sans font-bold uppercase tracking-wide text-slate-500">CIN / LLPIN</span>{client.cin_llpin}</p>}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1.5">
                    {client.risk_level === 'Low' && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                    {client.risk_level === 'Medium' && <Shield className="w-4 h-4 text-amber-500" />}
                    {client.risk_level === 'High' && <ShieldAlert className="w-4 h-4 text-red-500" />}
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wider",
                      client.risk_level === 'Low' ? 'text-emerald-500' :
                      client.risk_level === 'Medium' ? 'text-amber-500' : 'text-red-500'
                    )}>
                      {client.risk_level || 'Low'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-1">
                    {client.email && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Mail className="w-3 h-3" />
                        <span className="break-all text-xs">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Phone className="w-3 h-3" />
                        <span className="text-xs">{client.phone}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {client.services?.map((service) => (
                      <span key={service} className="px-1.5 py-0.5 bg-gold/10 text-gold rounded text-[8px]">
                        {service}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="sticky right-0 z-10 bg-matte-black-light px-4 py-4 transition-colors group-hover:bg-matte-black">
                  <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedClient(client); }}
                      aria-label={`Open ${client.name}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 text-sm font-bold text-gold transition-colors hover:bg-gold hover:text-matte-black"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </button>
                    {canManageClients && <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(client); }}
                      aria-label={`Edit ${client.name}`}
                      title="Edit client"
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-700 p-3 text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800"
                    >
                      <Pencil className="w-4 h-4" />
                      <span className="sr-only">Edit</span>
                    </button>}
                    {allowClientDelete && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setClientToDelete(client); }}
                        aria-label={`Delete ${client.name}`}
                        title="Delete client"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-red-500/30 p-3 text-red-300 transition-colors hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="sr-only">Delete</span>
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>

    {/* Add Client Modal */}
    <Modal
      isOpen={canManageClients && showAddClient}
      onClose={closeAddClient}
      title="Add New Client"
      size="lg"
    >

          {formError && (
            <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Client Name *"
              className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <select
              className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="">Select Business Type</option>
              <option>Proprietorship</option>
              <option>Partnership Firm</option>
              <option>LLP</option>
              <option>Private Limited Company</option>
              <option>Public Company</option>
              <option>Trust</option>
              <option>NGO</option>
              <option>Others</option>
            </select>

            <input
              type="text"
              placeholder="PAN * (e.g., ABCDE1234F)"
              className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white uppercase"
              value={formData.pan}
              onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
              maxLength={10}
              pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]"
              title="PAN must contain 5 letters, 4 numbers, and 1 letter"
            />

            <input
              type="text"
              placeholder="GSTIN (e.g., 27ABCDE1234F1Z5)"
              className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white uppercase"
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
              maxLength={15}
              pattern="(0[1-9]|[12][0-9]|3[0-8])[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z]Z[0-9A-Za-z]"
              title="Please enter a valid 15-character GSTIN"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="TAN (optional)"
                className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white uppercase"
                value={formData.tan}
                onChange={(e) => setFormData({ ...formData, tan: e.target.value.toUpperCase() })}
                maxLength={10}
                pattern="[A-Za-z]{4}[0-9]{5}[A-Za-z]"
                title="TAN must contain 4 letters, 5 numbers, and 1 letter"
              />
              <input
                type="text"
                placeholder="CIN / LLPIN (optional)"
                className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white uppercase"
                value={formData.cinLlpin}
                onChange={(e) => setFormData({ ...formData, cinLlpin: e.target.value.toUpperCase() })}
                maxLength={21}
                title="Please enter a valid CIN or LLPIN"
              />
            </div>

            <input
              type="text"
              placeholder="Portal username (optional, no password)"
              className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white"
              value={formData.portalUsername}
              onChange={(e) => setFormData({ ...formData, portalUsername: e.target.value })}
            />

            <input
              type="email"
              maxLength={254}
              placeholder="Email"
              className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <input
              type="tel"
              inputMode="numeric"
              maxLength={14}
              pattern="(?:[+]91[ -]?)?[6-9][0-9]{9}"
              title="Please enter a valid 10-digit Indian mobile number"
              placeholder="Phone"
              className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />

            <div>
              <p className="text-sm text-slate-400 mb-3">Services</p>
              <div className="grid grid-cols-2 gap-3">
                {CLIENT_SERVICE_OPTIONS.map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(service)}
                    className={cn(
                      'p-3 rounded-xl border transition-all text-sm font-bold',
                      formData.services.includes(service)
                        ? 'bg-gold text-matte-black border-gold'
                        : 'bg-matte-black border-slate-700 text-slate-300'
                    )}
                  >
                    {service}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={closeAddClient}
                className="flex-1 p-3 rounded-xl bg-slate-800 text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveClient}
                className="flex-1 p-3 rounded-xl bg-gold text-matte-black font-bold"
              >
                Save Client
              </button>
            </div>
          </div>
    </Modal>

    <Modal isOpen={canManageClients && showBulkImport} onClose={() => !uploading && setShowBulkImport(false)} title="Bulk import clients" size="xl">
      <div className="space-y-5">
        <div className="rounded-xl border border-sky-400/20 bg-sky-400/5 p-4 text-sm text-sky-100"><strong>Safe import:</strong> upload CSV or XLSX, review every row, then import only valid records. Existing and repeated PANs are blocked. Nothing is added until you select <strong>Import valid clients</strong>. For Services, use the Excel dropdown or type one or more values separated by <strong>|</strong>, comma, or semicolon.</div>
        <div className="flex flex-wrap gap-3"><button type="button" onClick={downloadClientImportTemplate} className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold hover:border-gold">Download Excel template</button><button type="button" onClick={downloadClientImportCsvTemplate} className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold hover:border-gold">Download CSV template</button><label className="cursor-pointer rounded-lg bg-gold px-4 py-2 text-sm font-black text-matte-black"><input type="file" accept=".csv,.xlsx" className="hidden" onChange={(event) => void handleBulkFile(event.target.files?.[0])}/>{uploading ? 'Reading file…' : 'Choose CSV or XLSX'}</label></div>
        {bulkError && <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{bulkError}</div>}
        {bulkPreview && <><div className="grid grid-cols-3 gap-3"><div className="rounded-lg border border-slate-700 p-3"><p className="text-2xl font-black text-white">{bulkPreview.rows.length}</p><p className="text-xs text-slate-500">Rows found</p></div><div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3"><p className="text-2xl font-black text-emerald-300">{bulkPreview.validRows.length}</p><p className="text-xs text-slate-500">Ready to import</p></div><div className="rounded-lg border border-red-400/20 bg-red-400/5 p-3"><p className="text-2xl font-black text-red-300">{bulkPreview.invalidRows.length}</p><p className="text-xs text-slate-500">Need correction</p></div></div><div className="max-h-72 overflow-auto rounded-lg border border-slate-800"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-matte-black text-xs uppercase text-slate-500"><tr><th className="p-3">Row</th><th>Client</th><th>PAN</th><th>Result</th></tr></thead><tbody>{bulkPreview.rows.map((row) => <tr key={row.rowNumber} className="border-t border-slate-800"><td className="p-3">{row.rowNumber}</td><td>{row.name || '—'}</td><td className="font-mono">{row.pan || '—'}</td><td className={row.errors.length ? 'text-red-300' : 'text-emerald-300'}>{row.errors.length ? row.errors.join(' ') : 'Ready'}</td></tr>)}</tbody></table></div><div className="flex justify-end gap-3"><button type="button" onClick={() => setShowBulkImport(false)} disabled={uploading} className="rounded-lg bg-slate-800 px-4 py-2 font-bold">Cancel</button><button type="button" onClick={() => void handleBulkImport()} disabled={uploading || !bulkPreview.validRows.length} className="rounded-lg bg-gold px-4 py-2 font-black text-matte-black disabled:opacity-40">{uploading ? 'Importing…' : `Import ${bulkPreview.validRows.length} valid client${bulkPreview.validRows.length === 1 ? '' : 's'}`}</button></div></>}
      </div>
    </Modal>

    {/* Delete Confirmation */}
    {clientToDelete && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setClientToDelete(null)}>
        <div className="bg-matte-black-light border border-slate-800 rounded-2xl p-6 w-[400px]" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-bold text-white mb-3">Delete Client</h3>
          <p className="text-slate-400 mb-6">
            Are you sure you want to delete <span className="text-gold font-bold">{clientToDelete.name}</span>?
          </p>
          <div className="flex gap-3">
            <button onClick={() => setClientToDelete(null)} className="flex-1 p-3 rounded-xl bg-slate-800 text-white">
              Cancel
            </button>
            <button onClick={handleDeleteClient} className="flex-1 p-3 rounded-xl bg-red-600 text-white font-bold">
              Delete
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Edit Modal */}
    <Modal
      isOpen={!!editClient}
      onClose={() => guardClientModalClose(() => setEditClient(null))}
      title="Edit Client"
      size="lg"
    >

          {formError && (
            <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-700 bg-matte-black p-4">
              <div className="mb-3">
                <p className="text-sm font-bold text-slate-200">Registered identity</p>
                <p className="mt-1 text-xs text-slate-500">PAN and GSTIN are the primary identifiers shown in the client list. They are fixed after client creation.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Entity type</p>
                  <p className="mt-1 text-sm text-white">{editClient?.type || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">PAN</p>
                  <p className="mt-1 font-mono text-sm text-white">{editClient?.pan || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">GSTIN</p>
                  <p className="mt-1 font-mono text-sm text-white">{editClient?.gstin || 'Not registered'}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Client Name</label>
              <input
                type="text"
                maxLength={120}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-matte-black border border-slate-700 rounded-xl p-3 text-white w-full"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Email</label>
              <input
                type="email"
                maxLength={254}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-matte-black border border-slate-700 rounded-xl p-3 text-white w-full"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <p className="col-span-full -mb-1 text-xs text-slate-500">Additional entity and tax identifiers</p>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">TAN</label>
                <input
                  maxLength={10}
                  pattern="[A-Za-z]{4}[0-9]{5}[A-Za-z]"
                  title="TAN must contain 4 letters, 5 numbers, and 1 letter"
                  value={formData.tan}
                  onChange={(e) => setFormData({ ...formData, tan: e.target.value.toUpperCase() })}
                  className="bg-matte-black border border-slate-700 rounded-xl p-3 text-white w-full uppercase"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">CIN / LLPIN</label>
                <input
                  maxLength={21}
                  title="Please enter a valid CIN or LLPIN"
                  value={formData.cinLlpin}
                  onChange={(e) => setFormData({ ...formData, cinLlpin: e.target.value.toUpperCase() })}
                  className="bg-matte-black border border-slate-700 rounded-xl p-3 text-white w-full uppercase"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Portal Username</label>
              <input
                type="text"
                value={formData.portalUsername}
                onChange={(e) => setFormData({ ...formData, portalUsername: e.target.value })}
                className="bg-matte-black border border-slate-700 rounded-xl p-3 text-white w-full"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Phone</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={14}
                pattern="(?:[+]91[ -]?)?[6-9][0-9]{9}"
                title="Please enter a valid 10-digit Indian mobile number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-matte-black border border-slate-700 rounded-xl p-3 text-white w-full"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => guardClientModalClose(() => setEditClient(null))} className="flex-1 p-3 rounded-xl bg-slate-800 text-white">
                Cancel
              </button>
              <button onClick={handleUpdateClient} className="flex-1 p-3 rounded-xl bg-gold text-matte-black font-bold">
                Update Client
              </button>
            </div>
          </div>
    </Modal>

    {/* Client Detail Sidebar */}
    {selectedClient && (
      <ClientGovernanceSidebar client={selectedClient} onClose={() => setSelectedClient(null)} />
    )}

    {/* Client 360 Profile */}
    {selectedClient && (
      <Suspense fallback={<ModalLoader label="Loading client operating system" />}>
        <ClientProfile
          client={selectedClient}
          isOpen={!!selectedClient}
          onEdit={() => {
            const clientToEdit = selectedClient;
            setSelectedClient(null);
            openEditModal(clientToEdit);
          }}
          onClose={() => setSelectedClient(null)}
        />
      </Suspense>
    )}
    </>
  );
};
