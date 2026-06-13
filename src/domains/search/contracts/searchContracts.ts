export interface SearchQuery {
  tenantId: string;
  actorRole: string;
  text: string;
  scope: Array<'clients' | 'tasks' | 'notices' | 'documents' | 'audit'>;
  limit?: number;
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  snippet: string;
  score: number;
}

