import { AuditCorrelationEngine } from './AuditCorrelationEngine';
import { ComplianceRetentionPolicies } from './ComplianceRetentionPolicies';
import { ImmutableAuditPipeline } from './ImmutableAuditPipeline';
import { WorkflowTraceHistory } from './WorkflowTraceHistory';
import { AuditRecord } from './types';

export class AuditRuntimeCoordinator {
  readonly pipeline = new ImmutableAuditPipeline();
  readonly correlation = new AuditCorrelationEngine();
  readonly retention = new ComplianceRetentionPolicies();
  readonly history = new WorkflowTraceHistory(() => this.pipeline.all());

  append(record: AuditRecord): void {
    this.pipeline.append(record);
  }
}

