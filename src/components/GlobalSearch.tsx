import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X, FileText, ChevronRight, Loader2, Command, Pin } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import {
  EnterpriseSearchCategory,
  EnterpriseSearchResult,
  searchEnterprise,
} from '../services/globalSearchService';
import { CommandAction, filterCommands, getRoleAwareCommands } from '../services/commandPaletteService';
import { QuickAccessPin, togglePin } from '../services/workspacePreferencesService';
import { useOverlayLifecycle } from '../hooks/useOverlayLifecycle';
import { aiOperationsOrchestrator, AIOperationalRecommendation } from '../domains/ai-operations';

export type SearchCategory = EnterpriseSearchCategory;
export type SearchResult = EnterpriseSearchResult;

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onResultClick?: (result: SearchResult) => void;
  onCommandAction?: (action: CommandAction) => void;
  activeTab?: string;
  pins?: QuickAccessPin[];
  onPinsChange?: (pins: QuickAccessPin[]) => void;
  recentSearchesProp?: string[];
  recentNavigationProp?: string[];
  onRecentSearchesChange?: (searches: string[]) => void;
  onRecentNavigationChange?: (items: string[]) => void;
}

const CATEGORY_LABELS: Record<SearchCategory, string> = {
  all: 'All',
  clients: 'Clients',
  tasks: 'Tasks',
  invoices: 'Invoices',
  compliances: 'Compliances',
  notices: 'Notices',
  staff: 'Staff',
  documents: 'Documents',
  subscriptions: 'Subscriptions',
  automations: 'Automations',
  approvals: 'Approvals',
  workflows: 'Workflows',
};

const RECENT_SEARCHES_KEY = 'caath:recent-searches';
const RECENT_NAVIGATION_KEY = 'caath:recent-navigation';
const PINNED_COMMANDS_KEY = 'caath:pinned-workflows';

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen,
  onClose,
  onResultClick,
  onCommandAction,
  activeTab,
  pins = [],
  onPinsChange,
  recentSearchesProp,
  recentNavigationProp,
  onRecentSearchesChange,
  onRecentNavigationChange,
}) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(recentSearchesProp || []);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentNavigation, setRecentNavigation] = useState<string[]>(recentNavigationProp || []);
  const [pinnedWorkflows, setPinnedWorkflows] = useState<string[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AIOperationalRecommendation[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useOverlayLifecycle({ isOpen, onClose, initialFocusRef: inputRef });

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    const stored = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    try {
      setRecentSearches(recentSearchesProp || (stored ? JSON.parse(stored) : []));
      setRecentNavigation(JSON.parse(window.localStorage.getItem(RECENT_NAVIGATION_KEY) || '[]'));
      setPinnedWorkflows(JSON.parse(window.localStorage.getItem(PINNED_COMMANDS_KEY) || '[]'));
    } catch {
      window.localStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
    }
  }, [isOpen, recentSearchesProp]);

  useEffect(() => {
    if (recentSearchesProp) setRecentSearches(recentSearchesProp);
  }, [recentSearchesProp]);

  useEffect(() => {
    if (recentNavigationProp) setRecentNavigation(recentNavigationProp);
  }, [recentNavigationProp]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const performSearch = useCallback(async (searchQuery: string, searchCategory: SearchCategory) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      setResults(await searchEnterprise({
        firmId: user?.firmId,
        userId: user?.id,
        query: searchQuery,
        category: searchCategory,
      }));
    } catch (error) {
      console.error('Global search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [user?.firmId, user?.id]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query, category), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, category, performSearch]);

  useEffect(() => setSelectedIndex(0), [results]);

  useEffect(() => {
    const loadAISuggestions = async () => {
      if (!user || query.trim().length < 2) {
        setAiSuggestions([]);
        return;
      }
      const suggestions = await aiOperationsOrchestrator.getOperationalSearchSuggestions(user, query.trim());
      setAiSuggestions(suggestions);
    };
    loadAISuggestions();
  }, [query, user]);

  const rememberSearch = (value: string) => {
    const next = [value, ...recentSearches.filter((item) => item !== value)].slice(0, 5);
    setRecentSearches(next);
    onRecentSearchesChange?.(next);
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  };

  const handleResultClick = (result: SearchResult) => {
    if (query.trim()) rememberSearch(query.trim());
    const nextNavigation = [result.title, ...recentNavigation.filter((item) => item !== result.title)].slice(0, 6);
    setRecentNavigation(nextNavigation);
    onRecentNavigationChange?.(nextNavigation);
    window.localStorage.setItem(RECENT_NAVIGATION_KEY, JSON.stringify(nextNavigation));
    onResultClick?.(result);
    onClose();
  };

  const availableCommands = filterCommands(getRoleAwareCommands(user?.role), query);
  const defaultPinned = getRoleAwareCommands(user?.role).filter((command) => command.pinDefault).map((command) => command.id);
  const effectivePinned = pinnedWorkflows.length > 0 ? pinnedWorkflows : defaultPinned;
  const pinnedCommands = getRoleAwareCommands(user?.role).filter((command) => effectivePinned.includes(command.id));

  const runCommand = (action: CommandAction) => {
    onCommandAction?.(action);
    onClose();
  };

  const getCommandPin = (commandId: CommandAction): QuickAccessPin | undefined => {
    const command = getRoleAwareCommands(user?.role).find((item) => item.id === commandId);
    if (!command) return undefined;
    return {
      id: `cmd-${command.id}`,
      type: 'workflow',
      label: command.title,
      target: command.tab || 'dashboard',
      subtitle: command.subtitle,
    };
  };

  const getResultPin = (result: SearchResult): QuickAccessPin => ({
    id: `${result.type}-${result.entityId}`,
    type: result.type === 'clients' ? 'client' : result.type === 'tasks' ? 'task' : result.type === 'notices' ? 'notice' : result.type === 'documents' ? 'document' : result.type === 'automations' ? 'automation' : result.type === 'approvals' ? 'approval' : 'workflow',
    label: result.title,
    target:
      result.type === 'clients' ? 'clients' :
      result.type === 'tasks' ? 'tasks' :
      result.type === 'documents' ? 'documents' :
      result.type === 'notices' ? 'notices' :
      result.type === 'automations' ? 'automation' :
      result.type === 'approvals' ? 'approvals' :
      'dashboard',
    subtitle: result.subtitle,
  });

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter' && results[selectedIndex]) {
      event.preventDefault();
      handleResultClick(results[selectedIndex]);
    } else if (event.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] pointer-events-none">
      <div className="absolute inset-0 bg-black/70 pointer-events-auto" onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }} />
      <div className="relative w-full max-w-2xl border border-slate-800 bg-matte-black-light shadow-2xl pointer-events-auto" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-800 p-4">
          <Search className="h-5 w-5 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search clients, GSTIN, tasks, notices, workflows..."
            className="flex-1 bg-transparent text-lg text-white outline-none placeholder:text-slate-500"
          />
          {loading && <Loader2 className="h-5 w-5 animate-spin text-gold" />}
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-800 p-2">
          {(Object.keys(CATEGORY_LABELS) as SearchCategory[]).map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={cn(
                'whitespace-nowrap px-3 py-1.5 text-xs font-bold uppercase transition-colors',
                category === item ? 'bg-gold text-matte-black' : 'bg-matte-black text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              {CATEGORY_LABELS[item]}
            </button>
          ))}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {!query && recentSearches.length > 0 && (
            <div className="border-b border-slate-800 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">Recent searches</p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((item) => (
                  <button key={item} onClick={() => setQuery(item)} className="border border-slate-800 px-2 py-1 text-xs text-slate-300 hover:border-gold/40">
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!query && (
            <div className="border-b border-slate-800 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">Pinned workflows</p>
              <div className="flex flex-wrap gap-2">
                {pinnedCommands.map((command) => (
                <button key={command.id} onClick={() => runCommand(command.id)} className="border border-slate-800 px-2 py-1 text-xs text-slate-300 hover:border-gold/40">
                  {command.title}
                </button>
                ))}
              </div>
            </div>
          )}
          {!query && recentNavigation.length > 0 && (
            <div className="border-b border-slate-800 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">Recent activity shortcuts</p>
              <div className="flex flex-wrap gap-2">
                {recentNavigation.map((item) => (
                  <span key={item} className="border border-slate-800 px-2 py-1 text-xs text-slate-400">{item}</span>
                ))}
              </div>
            </div>
          )}
          {availableCommands.length > 0 && (
            <div className="border-b border-slate-800 p-2">
              <p className="mb-2 px-2 text-[10px] font-bold uppercase text-slate-500">Command actions</p>
              {availableCommands.slice(0, 8).map((command) => (
                <button
                  key={command.id}
                  onClick={() => runCommand(command.id)}
                  className="flex w-full items-center gap-3 p-2 text-left transition-colors hover:bg-slate-800/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center border border-slate-700 bg-matte-black">
                    <Command className="h-4 w-4 text-gold" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{command.title}</p>
                    <p className="truncate text-xs text-slate-500">{command.subtitle}</p>
                  </div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      const pin = getCommandPin(command.id);
                      if (!pin) return;
                      onPinsChange?.(togglePin(pins, pin));
                    }}
                    className="text-slate-500 hover:text-gold"
                    title="Pin workflow"
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                </button>
              ))}
            </div>
          )}
          {aiSuggestions.length > 0 && (
            <div className="border-b border-slate-800 p-2">
              <p className="mb-2 px-2 text-[10px] font-bold uppercase text-slate-500">AI operational suggestions</p>
              {aiSuggestions.map((item) => (
                <div key={item.id} className="p-2 border border-slate-800 bg-slate-900/30 mb-2">
                  <p className="text-sm font-bold text-white">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.summary}</p>
                  <p className="text-xs text-gold mt-1">{item.recommendedAction}</p>
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && !loading && query && (
            <div className="p-8 text-center text-slate-500">No results found for "{query}"</div>
          )}

          {results.length === 0 && !loading && !query && recentSearches.length === 0 && (
            <div className="p-8 text-center text-slate-500">Start typing to search across the enterprise workspace</div>
          )}

          {results.map((result, index) => {
            const Icon = result.icon || FileText;
            return (
              <button
                key={result.id}
                onClick={() => handleResultClick(result)}
                className={cn(
                  'flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-800/50',
                  index === selectedIndex && 'bg-slate-800/50'
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center border border-slate-700 bg-matte-black">
                  <Icon className="h-5 w-5 text-gold" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{result.title}</p>
                  <p className="truncate text-xs text-slate-500">{result.subtitle}</p>
                </div>
                <div className="text-xs font-bold uppercase text-slate-600">{CATEGORY_LABELS[result.type]}</div>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onPinsChange?.(togglePin(pins, getResultPin(result)));
                  }}
                  className="text-slate-500 hover:text-gold"
                  title="Pin item"
                >
                  <Pin className="h-4 w-4" />
                </button>
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 p-3 text-[10px] text-slate-500">
          <span>Search (Ctrl+K) | Alt+X workspace | Alt+N task | Alt+Q approve | Alt+R resolve</span>
          {activeTab && <span className="text-slate-600">Current: {activeTab}</span>}
          <span>Role-aware commands | Esc to close</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
