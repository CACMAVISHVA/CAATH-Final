export interface SavedOperationalView {
  id: string;
  name: string;
  module: string;
  filters: Record<string, string | number | boolean>;
}

