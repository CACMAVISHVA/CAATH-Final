export interface AutomationRule {
  id: string;
  name: string;
  eventType: string;
  condition: string;
  action: 'escalate' | 'notify' | 'assign' | 'queue_job';
  enabled: boolean;
}

