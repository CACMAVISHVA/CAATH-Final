import { SearchQuery } from '../contracts/searchContracts';

export const searchAccessPolicy = {
  sanitizeQuery(query: SearchQuery): SearchQuery {
    return { ...query, text: query.text.trim(), limit: query.limit || 25 };
  },
  canSearchScope(role: string, scope: SearchQuery['scope'][number]): boolean {
    if (role === 'SuperAdmin' || role === 'Admin') return true;
    if (role === 'Staff') return scope !== 'audit';
    return scope === 'documents' || scope === 'notices';
  },
};

