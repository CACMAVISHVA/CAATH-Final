import { IntegrationRequest, WebhookEventContract } from './integrationContracts';

export const integrationOrchestrator = {
  async dispatch(_request: IntegrationRequest): Promise<{ accepted: boolean; reason?: string }> {
    return { accepted: true };
  },
  async publishWebhook(_event: WebhookEventContract): Promise<void> {},
};

