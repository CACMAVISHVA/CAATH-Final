export type AIProvider = {
  id: string;
  model: string;
  isEnabled: boolean;
};

export const aiProviderRegistry: AIProvider[] = [
  { id: 'openai-primary', model: 'gpt-4.1', isEnabled: true },
];
