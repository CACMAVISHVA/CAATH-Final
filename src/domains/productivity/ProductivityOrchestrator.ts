import { SavedOperationalView } from './types';

const STORAGE_KEY = 'caath:productivity:views';

export class ProductivityOrchestrator {
  saveView(view: SavedOperationalView): void {
    const current = this.listViews();
    const next = [...current.filter((item) => item.id !== view.id), view];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  listViews(): SavedOperationalView[] {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as SavedOperationalView[];
    } catch {
      return [];
    }
  }

  smartFilter<T extends Record<string, unknown>>(items: T[], query: string): T[] {
    const normalized = query.toLowerCase();
    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(normalized));
  }

  batchSelect<T>(items: T[], predicate: (item: T) => boolean): T[] {
    return items.filter(predicate);
  }
}

export const productivityOrchestrator = new ProductivityOrchestrator();

