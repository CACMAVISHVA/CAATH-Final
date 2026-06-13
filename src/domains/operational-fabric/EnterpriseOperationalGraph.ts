import { OperationalGraphEdge, OperationalGraphNode } from './types';

export class EnterpriseOperationalGraph {
  private readonly nodes = new Map<string, OperationalGraphNode[]>();
  private readonly edges = new Map<string, OperationalGraphEdge[]>();

  upsertNode(node: OperationalGraphNode): void {
    const list = this.nodes.get(node.tenantId) ?? [];
    const existingIndex = list.findIndex((item) => item.id === node.id);
    if (existingIndex >= 0) {
      list[existingIndex] = node;
    } else {
      list.push(node);
    }
    this.nodes.set(node.tenantId, list);
  }

  addEdge(tenantId: string, edge: OperationalGraphEdge): void {
    const list = this.edges.get(tenantId) ?? [];
    list.push(edge);
    this.edges.set(tenantId, list);
  }

  snapshot(tenantId: string): { nodes: OperationalGraphNode[]; edges: OperationalGraphEdge[] } {
    return {
      nodes: [...(this.nodes.get(tenantId) ?? [])],
      edges: [...(this.edges.get(tenantId) ?? [])],
    };
  }
}
