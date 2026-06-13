/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
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

const ClientProfile = lazy(() => import('./ClientProfile'));

const SERVICE_OPTIONS = [
  'GST Filing',
  'Income Tax',
  'Audit',
  'ROC Filing',
  'Payroll',
  'Bookkeeping',
];

interface ClientFormData {
  name: string;
  type: string;
  pan: string;
  gstin: string;
  email: string;
  phone: string;
  services: string[];
}

export const ClientMaster: React.FC<{ assignedOnly?: boolean; assignedClients?: string[] }> = ({ assignedOnly, assignedClients }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddClient, setShowAddClient] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientRow | null>(null);
  const [editClient, setEditClient] = useState<ClientRow | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    type: '',
    pan: '',
    gstin: '',
    email: '',
    phone: '',
    services: [],
  });
  const defaultClientForm: ClientFormData = {
    name: '',
    type: '',
    pan: '',
    gstin: '',
    email: '',
    phone: '',
    services: [],
  };
  const hasUnsavedClientChanges = (() => {
    if (showAddClient) {
      return JSON.stringify(formData) !== JSON.stringify(defaultClientForm);
    }
    if (editClient) {
      return (
        formData.name !== (editClient.name || '') ||
        formData.email !== (editClient.email || '') ||
        formData.phone !== (editClient.phone || '') ||
        JSON.stringify(formData.services) !== JSON.stringify(editClient.services || [])
      );
    }
    return false;
  })();
  const guardClientModalClose = useUnsavedChangesGuard(hasUnsavedClientChanges);

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
      if (customEvent.detail?.action === 'create-client') {
        setShowAddClient(true);
        setFormError(null);
      }
    };
    window.addEventListener('caath:quick-action', onQuickAction);
    return () => window.removeEventListener('caath:quick-action', onQuickAction);
  }, []);

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
    if (!user) return;

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
        email: formData.email,
        phone: formData.phone,
        services: formData.services,
        user,
      });

      setFormData(defaultClientForm);
      setShowAddClient(false);
      loadClients();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save client');
    }
  };

  const handleUpdateClient = async () => {
    if (!user || !editClient) return;

    setFormError(null);

    try {
      await updateClient(editClient.id, {
        name: formData.name,
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

  const openEditModal = (client: ClientRow) => {
    setEditClient(client);
    setFormData({
      name: client.name || '',
      type: client.type || '',
      pan: client.pan || '',
      gstin: client.gstin || '',
      email: client.email || '',
      phone: client.phone || '',
      services: client.services || [],
    });
    setFormError(null);
  };

  const filteredClients = clients.filter((client) => {
    const name = client.name ?? '';
    const pan = client.pan ?? '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pan.toLowerCase().includes(searchTerm.toLowerCase());

    if (assignedOnly && assignedClients) {
      return matchesSearch && assignedClients.includes(client.id);
    }
    return matchesSearch;
  });

  return (
    <>
    <div className="p-8 space-y-6 h-full bg-matte-black text-slate-300 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gold-text-gradient">Client Master</h2>
          <p className="text-slate-500">Manage your clients and their compliance profiles.</p>
        </div>
        <button
         onClick={() => { setShowAddClient(true); setFormError(null); setFormData({
          name: '',
          type: '',
          pan: '',
          gstin: '',
          email: '',
          phone: '',
          services: [],
        }); }}
        className="flex items-center gap-2 px-6 py-2.5 bg-gold text-matte-black rounded-xl font-bold hover:bg-gold-light"
    >
          <Plus className="w-4 h-4" />
          Add New Client
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, PAN, or GSTIN..."
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
      <div className="bg-matte-black-light rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-matte-black border-b border-slate-800">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">PAN / GSTIN</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Risk Level</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Services</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
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
                <td className="px-6 py-4">
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
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-800 text-slate-400 rounded-md text-[10px] font-bold uppercase tracking-wider border border-slate-700">
                    {client.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-mono text-slate-300">{client.pan}</p>
                  <p className="text-[10px] font-mono text-slate-500">{client.gstin || '-'}</p>
                </td>
                <td className="px-6 py-4">
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
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {client.email && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Mail className="w-3 h-3" />
                        <span className="text-xs">{client.email}</span>
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
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {client.services?.map((service) => (
                      <span key={service} className="px-1.5 py-0.5 bg-gold/10 text-gold rounded text-[8px]">
                        {service}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedClient(client); }}
                      className="p-2 text-slate-500 hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(client); }}
                      className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {allowClientDelete && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setClientToDelete(client); }}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
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
      isOpen={showAddClient}
      onClose={() => guardClientModalClose(() => setShowAddClient(false))}
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
            />

            <input
              type="text"
              placeholder="GSTIN (e.g., 27ABCDE1234F1Z5)"
              className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white uppercase"
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
              maxLength={15}
            />

            <input
              type="email"
              placeholder="Email"
              className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <input
              type="text"
              placeholder="Phone"
              className="w-full p-3 rounded-xl bg-matte-black border border-slate-700 text-white"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />

            <div>
              <p className="text-sm text-slate-400 mb-3">Services</p>
              <div className="grid grid-cols-2 gap-3">
                {SERVICE_OPTIONS.map((service) => (
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
                onClick={() => guardClientModalClose(() => setShowAddClient(false))}
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
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Client Name</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-matte-black border border-slate-700 rounded-xl p-3 text-white w-full"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Email</label>
              <input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-matte-black border border-slate-700 rounded-xl p-3 text-white w-full"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Phone</label>
              <input
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
          onClose={() => setSelectedClient(null)}
        />
      </Suspense>
    )}
    </>
  );
};
