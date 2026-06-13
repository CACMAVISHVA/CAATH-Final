import { SearchQuery, SearchResult } from '../contracts/searchContracts';
import { searchAccessPolicy } from '../policies/searchAccessPolicy';

export const searchOrchestrator = {
  async query(input: SearchQuery): Promise<SearchResult[]> {
    const safe = searchAccessPolicy.sanitizeQuery(input);
    const allowedScopes = safe.scope.filter((scope) => searchAccessPolicy.canSearchScope(safe.actorRole, scope));
    if (allowedScopes.length === 0) return [];
    return [];
  },
};

