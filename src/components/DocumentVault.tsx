/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Folder,
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  MoreVertical,
  ChevronRight,
  Search,
  Filter,
  Grid3X3,
  List,
  X,
  File,
  Image,
  FileSpreadsheet,
  FilePlus,
  Archive,
  RotateCcw,
  Tag,
  Link2,
  Clock,
  User,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import {
  DocumentVaultFile,
  DocumentCategory,
  DocumentType,
  DOCUMENT_CATEGORIES,
  DOCUMENT_TYPES,
  uploadDocument,
  getDocuments,
  getClientDocuments,
  restoreDocument,
  archiveDocument,
  getDeletedDocuments,
  getArchivedDocuments,
  DocumentSearchParams,
  getDocumentVersions,
  getExpiringDocuments,
  getStorageAnalytics,
} from '../services/documentVaultService';

interface DocumentVaultProps {
  clientId?: string;
  linkedTaskId?: string;
  linkedNoticeId?: string;
  onClose?: () => void;
}

type ViewMode = 'grid' | 'list';
type VaultTab = 'all' | 'archived' | 'trash';

const FILE_TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  'application/pdf': FileText,
  'image/': Image,
  'application/vnd.ms-excel': FileSpreadsheet,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
  'default': File,
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('image')) return Image;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return FileSpreadsheet;
  return File;
};

export const DocumentVault: React.FC<DocumentVaultProps> = ({
  clientId,
  linkedTaskId,
  linkedNoticeId,
}) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentVaultFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState<VaultTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentVaultFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<DocumentVaultFile | null>(null);
  const [versions, setVersions] = useState<DocumentVaultFile[]>([]);
  const [expiringCount, setExpiringCount] = useState(0);
  const [storageBytes, setStorageBytes] = useState(0);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);

  // Upload form state
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('GST');
  const [uploadType, setUploadType] = useState<DocumentType>('GSTR-1');
  const [uploadTags, setUploadTags] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    if (!user?.firmId) return;

    setLoading(true);
    try {
      let docs: DocumentVaultFile[];

      if (clientId) {
        docs = await getClientDocuments(clientId);
      } else if (activeTab === 'trash') {
        docs = await getDeletedDocuments(user.firmId);
      } else if (activeTab === 'archived') {
        docs = await getArchivedDocuments(user.firmId);
      } else {
        const params: DocumentSearchParams = {
          firmId: user.firmId,
          clientId,
          limit: 100,
        };
        docs = await getDocuments(params);
      }

      setDocuments(docs);
      const [expiring, storage] = await Promise.all([
        getExpiringDocuments(user.firmId),
        getStorageAnalytics(user.firmId),
      ]);
      setExpiringCount(expiring.length);
      setStorageBytes(storage.totalBytes);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.firmId, clientId, activeTab]);

  React.useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesSearch = !searchTerm || doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group by category for grid view
  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
    const cat = doc.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {} as Record<string, DocumentVaultFile[]>);

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !clientId || !user?.firmId) return;

    setUploading(true);
    try {
      setUploadQueue(Array.from(files).map((file) => file.name));
      for (const file of Array.from(files)) {
        await uploadDocument({
          firmId: user.firmId,
          clientId,
          category: uploadCategory,
          documentType: uploadType,
          file,
          linkedTaskId,
          linkedNoticeId,
          tags: uploadTags ? uploadTags.split(',').map(t => t.trim()) : [],
          user,
        });
      }
      setShowUploadModal(false);
      setUploadQueue([]);
      loadDocuments();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0 && clientId) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Category stats
  const categoryStats = documents.reduce((acc, doc) => {
    acc[doc.category] = (acc[doc.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const openDocument = async (document: DocumentVaultFile) => {
    setSelectedDocument(document);
    setVersions(await getDocumentVersions(document.id));
  };

  return (
    <div className="flex flex-col h-full bg-matte-black text-slate-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Document Vault</h2>
            <p className="text-xs text-slate-500">
              {clientId ? 'Client Documents' : 'All Documents'}
              {documents.length > 0 && ` • ${documents.length} files`}
            </p>
            <p className="text-xs text-slate-600">
              Storage {formatFileSize(storageBytes)} | {expiringCount} expiry alert{expiringCount === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {clientId && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-gold text-matte-black rounded-lg text-sm font-bold"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4">
          {(['all', 'archived', 'trash'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors",
                activeTab === tab
                  ? "bg-gold/10 text-gold"
                  : "text-slate-500 hover:text-white"
              )}
            >
              {tab === 'all' ? 'All Files' : tab === 'archived' ? 'Archived' : 'Trash'}
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-matte-black-light border border-slate-800 rounded-lg text-sm text-white"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory | 'all')}
            className="px-3 py-2 bg-matte-black-light border border-slate-800 rounded-lg text-sm text-white"
          >
            <option value="all">All Categories</option>
            {DOCUMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 bg-matte-black-light border border-slate-800 rounded-lg"
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Folder className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">No documents found</p>
            {clientId && (
              <p className="text-xs mt-2">Upload files to get started</p>
            )}
          </div>
        ) : viewMode === 'list' ? (
          // List View
          <div className="space-y-1">
            {filteredDocuments.map((doc) => {
              const Icon = getFileIcon(doc.mime_type);
              return (
                <div
                  key={doc.id}
                  className={cn(
                    "flex items-center gap-3 p-3 bg-matte-black-light rounded-lg border border-slate-800 hover:border-gold/30 transition-colors cursor-pointer",
                    doc.is_archived && "opacity-60"
                  )}
                  onClick={() => openDocument(doc)}
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{doc.category}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      <span>{formatDate(doc.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-bold uppercase">
                      v{doc.version}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Grid View
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredDocuments.map((doc) => {
              const Icon = getFileIcon(doc.mime_type);
              return (
                <div
                  key={doc.id}
                  className={cn(
                    "p-4 bg-matte-black-light rounded-xl border border-slate-800 hover:border-gold/30 transition-colors cursor-pointer",
                    doc.is_archived && "opacity-60"
                  )}
                  onClick={() => openDocument(doc)}
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-3 mx-auto">
                    <Icon className="w-6 h-6 text-gold" />
                  </div>
                  <p className="text-sm font-bold text-white text-center truncate">{doc.name}</p>
                  <p className="text-xs text-slate-500 text-center mt-1">{doc.category}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowUploadModal(false)}>
          <div className="bg-matte-black-light border border-slate-800 rounded-2xl p-6 w-[500px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gold">Upload Document</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-colors",
                dragOver ? "border-gold bg-gold/5" : "border-slate-700"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className={cn("w-10 h-10 mx-auto mb-3", dragOver ? "text-gold" : "text-slate-500")} />
              <p className="text-sm text-white mb-1">Drag files here or click to browse</p>
              <p className="text-xs text-slate-500">PDF, Excel, Word, Images up to 50MB</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </div>

            {/* Category & Type */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => {
                    const category = e.target.value as DocumentCategory;
                    setUploadCategory(category);
                    setUploadType(DOCUMENT_TYPES[category][0]);
                  }}
                  className="w-full p-3 bg-matte-black border border-slate-700 rounded-lg text-sm text-white"
                >
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Document Type</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as DocumentType)}
                  className="w-full p-3 bg-matte-black border border-slate-700 rounded-lg text-sm text-white"
                >
                  {DOCUMENT_TYPES[uploadCategory].map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div className="mb-6">
              <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Tags (comma separated)</label>
              <input
                type="text"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="e.g., Q1, 2026, Important"
                className="w-full p-3 bg-matte-black border border-slate-700 rounded-lg text-sm text-white"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 p-3 bg-slate-800 text-slate-300 rounded-lg font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 p-3 bg-gold text-matte-black rounded-lg font-bold disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Select Files'}
              </button>
            </div>
            {uploadQueue.length > 0 && (
              <div className="mt-4 border border-slate-800 p-3">
                <p className="mb-2 text-xs font-bold text-slate-500">Bulk Upload Queue</p>
                {uploadQueue.map((item) => <p key={item} className="text-xs text-slate-300">{item}</p>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Detail Sidebar */}
      {selectedDocument && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedDocument(null)} />
          <div className="relative w-[450px] bg-matte-black-light border-l border-slate-800 h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Document Details</h3>
              <button onClick={() => setSelectedDocument(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* File Icon & Name */}
              <div className="text-center p-6 bg-matte-black rounded-xl">
                {React.createElement(getFileIcon(selectedDocument.mime_type), { className: "w-16 h-16 text-gold mx-auto mb-3" })}
                <p className="text-sm font-bold text-white">{selectedDocument.name}</p>
              </div>

              {/* Metadata */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Category</span>
                  <span className="text-sm text-white">{selectedDocument.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Type</span>
                  <span className="text-sm text-white">{selectedDocument.document_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Size</span>
                  <span className="text-sm text-white">{formatFileSize(selectedDocument.file_size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Version</span>
                  <span className="text-sm text-white">v{selectedDocument.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Uploaded By</span>
                  <span className="text-sm text-white">{selectedDocument.uploaded_by_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Date</span>
                  <span className="text-sm text-white">{formatDate(selectedDocument.created_at)}</span>
                </div>
              </div>

              {/* Tags */}
              {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDocument.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-slate-800 text-slate-400 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {versions.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Version History</p>
                  <div className="space-y-2">
                    {versions.map((version) => (
                      <div key={version.id} className="flex justify-between text-xs text-slate-300">
                        <span>v{version.version}</span>
                        <span>{formatDate(version.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              {(selectedDocument.linked_task_id || selectedDocument.linked_notice_id) && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Linked To</p>
                  <div className="space-y-2">
                    {selectedDocument.linked_task_id && (
                      <div className="flex items-center gap-2 text-sm">
                        <Link2 className="w-4 h-4 text-gold" />
                        <span className="text-white">Task: {selectedDocument.linked_task_id.slice(0, 8)}...</span>
                      </div>
                    )}
                    {selectedDocument.linked_notice_id && (
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <span className="text-white">Notice: {selectedDocument.linked_notice_id.slice(0, 8)}...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-slate-800 flex gap-2">
              <button onClick={() => setPreviewDocument(selectedDocument)} className="flex-1 flex items-center justify-center gap-2 p-2 bg-matte-black border border-slate-700 rounded-lg text-sm text-white hover:border-gold/50">
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 p-2 bg-matte-black border border-slate-700 rounded-lg text-sm text-white hover:border-gold/50">
                <Download className="w-4 h-4" />
                Download
              </button>
              {activeTab === 'trash' && (
                <button className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 hover:bg-emerald-500/20">
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              {activeTab === 'all' && (
                <button className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-amber-400">
                  <Archive className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {previewDocument && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6" onClick={() => setPreviewDocument(null)}>
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden border border-slate-800 bg-matte-black-light" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 p-4">
              <p className="font-bold text-white">{previewDocument.name}</p>
              <button onClick={() => setPreviewDocument(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="h-[70vh] bg-matte-black p-4">
              {previewDocument.mime_type.includes('pdf') ? (
                <iframe src={previewDocument.file_path} className="h-full w-full" title={previewDocument.name} />
              ) : previewDocument.mime_type.includes('image') ? (
                <img src={previewDocument.file_path} alt={previewDocument.name} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-500">Preview unavailable for this file type.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentVault;
