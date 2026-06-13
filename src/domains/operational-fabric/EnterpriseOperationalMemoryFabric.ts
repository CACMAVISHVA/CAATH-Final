import { OperationalMemoryRecord } from './types';

export class EnterpriseOperationalMemoryFabric {
  private readonly records = new Map<string, OperationalMemoryRecord[]>();

  append(record: OperationalMemoryRecord): void {
    const existing = this.records.get(record.tenantId) ?? [];
    existing.push(record);
    this.records.set(record.tenantId, existing);
  }

  list(tenantId: string, limit = 200): OperationalMemoryRecord[] {
    return [...(this.records.get(tenantId) ?? [])]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  search(tenantId: string, query: string): OperationalMemoryRecord[] {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return this.list(tenantId).filter((item) =>
      `${item.title} ${item.summary} ${item.relatedEntityIds.join(' ')}`.toLowerCase().includes(needle),
    );
  }
}
